// @vitest-environment jsdom
import { createElement, type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({
  updateReadProgress: vi.fn(),
  deleteReadProgress: vi.fn(),
  updateSeriesReadStatus: vi.fn(),
  refresh: vi.fn(),
  toast: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/app/actions/read-progress", () => ({
  updateReadProgress: mocks.updateReadProgress,
  deleteReadProgress: mocks.deleteReadProgress,
  updateSeriesReadStatus: mocks.updateSeriesReadStatus,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/hooks/useTranslate", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

vi.mock("@/lib/logger", () => ({
  default: { error: mocks.loggerError },
}));

import {
  ReadProgressMutationsProvider,
  useReadProgressMutations,
} from "./ReadProgressMutationsContext";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const book: NormalizedBook = {
  id: "book-1",
  libraryId: "library-1",
  title: "Tome 1",
  number: "1",
  seriesId: "series-1",
  seriesName: "Série",
  volume: 1,
  pageCount: 48,
  thumbnailUrl: "",
  media: { pageUrlTemplate: "", thumbnailUrlTemplate: "" },
  readProgress: null,
};

const series: NormalizedSeries = {
  id: "series-1",
  name: "Série",
  bookCount: 4,
  booksReadCount: 1,
  thumbnailUrl: "",
};

function Wrapper({ children }: { children: ReactNode }) {
  return createElement(ReadProgressMutationsProvider, null, children);
}

function renderMutations() {
  return renderHook(() => useReadProgressMutations(), { wrapper: Wrapper });
}

describe("ReadProgressMutationsContext", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("marks a book read optimistically, then toasts and refreshes once", async () => {
    const pending = deferred<{ success: boolean }>();
    mocks.updateReadProgress.mockReturnValueOnce(pending.promise);
    const { result } = renderMutations();

    let mutation: Promise<boolean> | undefined;
    act(() => {
      mutation = result.current.markBook(book, true);
    });

    expect(result.current.resolveBook(book).readProgress).toMatchObject({
      page: 48,
      completed: true,
    });
    expect(result.current.pendingBook(book.id)).toBe(true);
    expect(mocks.updateReadProgress).toHaveBeenCalledWith(book.id, 48, true, "series-1");
    expect(mocks.refresh).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ success: true });
      await mutation;
    });

    expect(result.current.pendingBook(book.id)).toBeNull();
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "books.actions.markAsRead.success.title" })
    );
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    // Cache serveur encore en retard : le marquage enregistré reste affiché.
    expect(result.current.resolveBook(book).readProgress?.completed).toBe(true);
  });

  it("forgets a recorded override when the reader opens the book", async () => {
    const readBook: NormalizedBook = {
      ...book,
      readProgress: { page: 48, completed: true, lastReadAt: null },
    };
    mocks.deleteReadProgress.mockResolvedValueOnce({ success: true });
    const { result } = renderMutations();

    await act(async () => {
      await result.current.markBook(readBook, false);
    });
    expect(result.current.resolveBook(readBook).readProgress).toBeNull();

    // Le lecteur, autre écrivain de la progression, relit le tome jusqu'au bout.
    act(() => result.current.forgetBook(readBook.id));
    expect(result.current.resolveBook(readBook).readProgress?.completed).toBe(true);
  });

  it("drops the recorded book overrides of a series marked as a whole", async () => {
    const readBook: NormalizedBook = {
      ...book,
      readProgress: { page: 48, completed: true, lastReadAt: null },
    };
    mocks.deleteReadProgress.mockResolvedValueOnce({ success: true });
    mocks.updateSeriesReadStatus.mockResolvedValueOnce({ success: true, updated: 10 });
    const { result } = renderMutations();

    await act(async () => {
      await result.current.markBook(readBook, false);
    });
    await act(async () => {
      await result.current.markSeries({ ...series, id: readBook.seriesId! }, true);
    });

    // « Tout marquer lu » ramène le tome à `done:48` : l'ancien « non lu » ne revient pas.
    expect(result.current.resolveBook(readBook).readProgress?.completed).toBe(true);
  });

  it("rolls a book back and does not refresh when the action fails", async () => {
    const readBook: NormalizedBook = {
      ...book,
      readProgress: { page: 48, completed: true, lastReadAt: null },
    };
    mocks.deleteReadProgress.mockResolvedValueOnce({ success: false, message: "Refusé" });
    const { result } = renderMutations();

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.markBook(readBook, false);
    });

    expect(outcome).toBe(false);
    expect(mocks.deleteReadProgress).toHaveBeenCalledWith(book.id, "series-1");
    expect(result.current.resolveBook(readBook)).toBe(readBook);
    expect(result.current.pendingBook(book.id)).toBeNull();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "books.actions.markAsUnread.error.title",
      })
    );
  });

  it("ignores a second mark on a book while one is in flight", async () => {
    const pending = deferred<{ success: boolean }>();
    mocks.updateReadProgress.mockReturnValueOnce(pending.promise);
    const { result } = renderMutations();

    let first: Promise<boolean> | undefined;
    act(() => {
      first = result.current.markBook(book, true);
    });

    let second: boolean | undefined;
    await act(async () => {
      second = await result.current.markBook(book, true);
    });
    expect(second).toBe(false);
    expect(mocks.updateReadProgress).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ success: true });
      await first;
    });
  });

  it("marks a whole series with an optimistic count and the updated total", async () => {
    const pending = deferred<{ success: boolean; updated: number; total: number }>();
    mocks.updateSeriesReadStatus.mockReturnValueOnce(pending.promise);
    const { result } = renderMutations();

    let mutation: Promise<boolean> | undefined;
    act(() => {
      mutation = result.current.markSeries(series, true);
    });

    expect(result.current.resolveSeries(series).booksReadCount).toBe(4);
    expect(result.current.pendingSeries(series.id)).toBe(true);

    await act(async () => {
      pending.resolve({ success: true, updated: 4, total: 4 });
      await mutation;
    });

    expect(result.current.pendingSeries(series.id)).toBeNull();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "series.header.markAllRead.success.title",
      description: "series.header.markAllRead.success.description",
    });
  });

  it("refreshes after a partial series failure but rolls the count back", async () => {
    mocks.updateSeriesReadStatus.mockResolvedValueOnce({
      success: false,
      message: "Mise à jour partielle (2/4)",
      updated: 2,
      total: 4,
    });
    const { result } = renderMutations();

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await result.current.markSeries(series, false);
    });

    expect(outcome).toBe(false);
    expect(result.current.resolveSeries(series)).toBe(series);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        title: "series.header.markAllUnread.error.title",
      })
    );
  });

  it("does not refresh when the series action throws", async () => {
    mocks.updateSeriesReadStatus.mockRejectedValueOnce(new Error("network"));
    const { result } = renderMutations();

    await act(async () => {
      await result.current.markSeries(series, true);
    });

    expect(result.current.resolveSeries(series)).toBe(series);
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
  });
});
