// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useImageLoader } from "./useImageLoader";

type LoaderProps = Parameters<typeof useImageLoader>[0];

const createObjectURLMock = vi.fn<(blob: Blob) => string>();
const revokeObjectURLMock = vi.fn<(url: string) => void>();
const fetchMock = vi.fn();

let blobCounter = 0;

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 1200;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function makeResponse(): Response {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob(["image"], { type: "image/jpeg" }),
  } as unknown as Response;
}

function makeProps(overrides: Partial<LoaderProps> = {}): LoaderProps {
  return {
    pageUrlBuilder: (pageNum) => `/pages/${pageNum}`,
    pages: Array.from({ length: 30 }, (_, index) => index + 1),
    currentPage: 1,
    shouldShowDoublePage: () => false,
    prefetchCount: 0,
    nextBook: null,
    ...overrides,
  };
}

function renderLoader(overrides: Partial<LoaderProps> = {}) {
  const props = makeProps(overrides);
  return renderHook(() => useImageLoader(props));
}

beforeEach(() => {
  blobCounter = 0;
  createObjectURLMock.mockReset();
  createObjectURLMock.mockImplementation(() => `blob:mock-${++blobCounter}`);
  revokeObjectURLMock.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(makeResponse());

  Object.defineProperty(globalThis.URL, "createObjectURL", {
    configurable: true,
    value: createObjectURLMock,
  });
  Object.defineProperty(globalThis.URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURLMock,
  });

  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("Image", MockImage);
  vi.spyOn(console, "debug").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete (globalThis.URL as unknown as { createObjectURL?: unknown }).createObjectURL;
  delete (globalThis.URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
});

describe("useImageLoader", () => {
  it("fetches the visible page and exposes it through getPageImage", async () => {
    const { result } = renderLoader();

    expect(result.current.getPageImage(1)).toEqual({
      url: null,
      error: false,
      isLoading: true,
    });

    await waitFor(() => {
      expect(result.current.getPageImage(1)).toEqual({
        url: "blob:mock-1",
        error: false,
        isLoading: false,
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/pages/1",
      expect.objectContaining({ cache: "default", signal: expect.any(AbortSignal) })
    );
    expect(revokeObjectURLMock).not.toHaveBeenCalled();
  });

  it("fetches both visible pages in double-page mode", async () => {
    const { result } = renderLoader({
      currentPage: 4,
      shouldShowDoublePage: () => true,
    });

    await waitFor(() => {
      expect(result.current.getPageImage(4).url).toBeDefined();
      expect(result.current.getPageImage(5).url).toBeDefined();
    });
  });

  it("does not fetch the second page in single-page mode", async () => {
    const { result } = renderLoader({
      currentPage: 4,
      shouldShowDoublePage: () => false,
    });

    await waitFor(() => {
      expect(result.current.getPageImage(4).url).toBeDefined();
    });

    expect(result.current.getPageImage(5).url).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("evicts and revokes pages outside the window when the page changes", async () => {
    const shouldShowDoublePage = () => false;
    const baseProps = makeProps({
      currentPage: 1,
      pages: Array.from({ length: 100 }, (_, index) => index + 1),
      shouldShowDoublePage,
    });
    const { result, rerender } = renderHook((props: LoaderProps) => useImageLoader(props), {
      initialProps: baseProps,
    });

    await waitFor(() => {
      expect(result.current.getPageImage(1).url).toBe("blob:mock-1");
    });

    rerender({ ...baseProps, currentPage: 100 });

    await waitFor(() => {
      expect(result.current.getPageImage(1).url).toBeNull();
    });
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-1");
  });

  it("revokes every live URL on unmount", async () => {
    const { result, unmount } = renderLoader();

    await waitFor(() => {
      expect(result.current.getPageImage(1).url).toBe("blob:mock-1");
    });

    unmount();

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-1");
  });

  it("deduplicates concurrent fetches for the same page", async () => {
    const resolvers: Array<(response: Response) => void> = [];
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const shouldShowDoublePage = () => false;
    const baseProps = makeProps({ currentPage: 1, shouldShowDoublePage });
    const { result, rerender } = renderHook((props: LoaderProps) => useImageLoader(props), {
      initialProps: baseProps,
    });

    rerender({ ...baseProps, currentPage: 2 });
    rerender({ ...baseProps, currentPage: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvers.forEach((resolve) => resolve(makeResponse()));
    });

    await waitFor(() => {
      expect(result.current.getPageImage(1).url).toBeDefined();
      expect(result.current.getPageImage(2).url).toBeDefined();
    });
  });

  it("prefetches the next book when the current book nears its end", async () => {
    const nextBook = {
      getPageUrl: (pageNum: number) => `/next/${pageNum}`,
      pageCount: 10,
    };
    renderLoader({
      currentPage: 3,
      pages: [1, 2, 3],
      prefetchCount: 5,
      nextBook,
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/next/1",
        expect.objectContaining({ cache: "default", signal: expect.any(AbortSignal) })
      );
    });
  });

  it("does not retry a failed next-book page on every page change", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async (url: string) =>
      url === "/next/1" ? { ok: false, status: 500 } : makeResponse()
    );
    const nextBook = { getPageUrl: (pageNum: number) => `/next/${pageNum}`, pageCount: 10 };
    const props = makeProps({ currentPage: 3, pages: [1, 2, 3, 4], prefetchCount: 1, nextBook });
    const { rerender } = renderHook((p: LoaderProps) => useImageLoader(p), { initialProps: props });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const nextCalls = () => fetchMock.mock.calls.filter(([url]) => url === "/next/1").length;
    expect(nextCalls()).toBe(3);

    rerender({ ...props, currentPage: 4 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(nextCalls()).toBe(3);
  });

  it("exposes a decode error and clears it on retry", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValue(makeResponse());

    const { result } = renderLoader();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.getPageImage(1).error).toBe(true);

    await act(async () => {
      await result.current.retryImage(1);
    });

    expect(result.current.getPageImage(1)).toEqual({
      url: "blob:mock-1",
      error: false,
      isLoading: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
