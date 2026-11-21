// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  standalone: { value: true },
  replaceDocument: vi.fn(),
}));

vi.mock("@/lib/browser/navigation", () => ({
  replaceDocument: hoisted.replaceDocument,
}));

vi.mock("@/lib/browser/standalone", () => ({
  isStandalonePwa: () => hoisted.standalone.value,
}));

import {
  READER_HIDDEN_AT_STORAGE_KEY,
  READER_RESUME_HOME_AFTER_MS,
} from "@/lib/reader/resume-home";
import { useReaderResumeHome } from "./useReaderResumeHome";

let visibility: DocumentVisibilityState = "visible";

function setVisibility(next: DocumentVisibilityState) {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  hoisted.standalone.value = true;
  hoisted.replaceDocument.mockReset();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("useReaderResumeHome", () => {
  it("goes home when a cold resume finds a long absence", async () => {
    window.sessionStorage.setItem(
      READER_HIDDEN_AT_STORAGE_KEY,
      String(Date.now() - READER_RESUME_HOME_AFTER_MS - 1)
    );

    const { result } = renderHook(() => useReaderResumeHome());

    await waitFor(() => expect(hoisted.replaceDocument).toHaveBeenCalledWith("/"));
    expect(result.current).toBe(true);
    expect(window.sessionStorage.getItem(READER_HIDDEN_AT_STORAGE_KEY)).toBeNull();
  });

  it("keeps the reader during a short absence", () => {
    window.sessionStorage.setItem(
      READER_HIDDEN_AT_STORAGE_KEY,
      String(Date.now() - 30_000)
    );

    const { result } = renderHook(() => useReaderResumeHome());

    expect(hoisted.replaceDocument).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
    expect(window.sessionStorage.getItem(READER_HIDDEN_AT_STORAGE_KEY)).toBeNull();
  });

  it("goes home when the same document comes back after the threshold", async () => {
    const { result } = renderHook(() => useReaderResumeHome());

    act(() => setVisibility("hidden"));
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + READER_RESUME_HOME_AFTER_MS + 1);
    act(() => setVisibility("visible"));

    expect(hoisted.replaceDocument).toHaveBeenCalledWith("/");
    expect(result.current).toBe(true);
  });

  it("stays in a regular browser tab", () => {
    hoisted.standalone.value = false;
    window.sessionStorage.setItem(
      READER_HIDDEN_AT_STORAGE_KEY,
      String(Date.now() - READER_RESUME_HOME_AFTER_MS - 1)
    );

    const { result } = renderHook(() => useReaderResumeHome());

    expect(hoisted.replaceDocument).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it("clears the marker when the reader unmounts normally", () => {
    const { unmount } = renderHook(() => useReaderResumeHome());

    setVisibility("hidden");
    expect(window.sessionStorage.getItem(READER_HIDDEN_AT_STORAGE_KEY)).not.toBeNull();

    unmount();

    expect(window.sessionStorage.getItem(READER_HIDDEN_AT_STORAGE_KEY)).toBeNull();
  });
});
