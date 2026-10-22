// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCoverLoaded } from "./useCoverLoaded";

const DEFAULT_SRC = "http://localhost/api/cover.jpg";

function Harness({
  src = DEFAULT_SRC,
  eager = false,
}: {
  src?: string;
  eager?: boolean;
}) {
  const { ref, loaded, failed, onLoad, onError } = useCoverLoaded(src, {
    eager,
  });
  return createElement("img", {
    ref,
    src,
    alt: "cover",
    onLoad,
    onError,
    "data-loaded": String(loaded),
    "data-failed": String(failed),
  });
}

/**
 * jsdom ne charge jamais les images : on pilote `complete` et `naturalWidth`,
 * les deux seules propriétés que lit le hook au montage.
 */
function mockImageState({
  complete,
  naturalWidth,
}: {
  complete: boolean;
  naturalWidth: number;
}) {
  vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(complete);
  vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(naturalWidth);
}

function getCover() {
  return screen.getByAltText("cover") as HTMLImageElement;
}

function retryParam(image: HTMLImageElement): string | null {
  return new URL(image.src).searchParams.get("retry");
}

describe("useCoverLoaded", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("marks the cover as loaded on load", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();
    expect(retryParam(image)).toBeNull();

    fireEvent.load(image);

    expect(image.dataset.loaded).toBe("true");
    expect(image.dataset.failed).toBe("false");
  });

  it("retries a failed cover with exponential backoff", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();
    fireEvent.error(image);

    expect(retryParam(image)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(retryParam(image)).toMatch(/^1-/);

    fireEvent.error(image);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(retryParam(image)).toMatch(/^2-/);
  });

  it("marks the cover as failed after the retries are exhausted", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();

    fireEvent.error(image);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.error(image);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.error(image);

    expect(image.dataset.loaded).toBe("false");
    expect(image.dataset.failed).toBe("true");
  });

  it("retries on mount when the cached cover already failed", () => {
    mockImageState({ complete: true, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(retryParam(image)).not.toBeNull();
  });

  it("sets loaded on mount when the cached cover is already complete", () => {
    mockImageState({ complete: true, naturalWidth: 1 });
    render(createElement(Harness));

    const image = getCover();

    expect(image.dataset.loaded).toBe("true");
    expect(retryParam(image)).toBeNull();
  });

  it("resets the state when the source changes", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    const { rerender } = render(createElement(Harness));

    fireEvent.load(getCover());
    expect(getCover().dataset.loaded).toBe("true");

    rerender(
      createElement(Harness, { src: "http://localhost/api/cover-2.jpg" })
    );

    expect(getCover().dataset.loaded).toBe("false");
    expect(getCover().src).toContain("cover-2.jpg");
  });

  it("retries a stalled request only for eager covers", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    const { rerender } = render(createElement(Harness));

    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(retryParam(getCover())).toBeNull();

    rerender(createElement(Harness, { eager: true }));

    act(() => {
      vi.advanceTimersByTime(20000);
      vi.advanceTimersByTime(1);
    });

    expect(retryParam(getCover())).not.toBeNull();
  });
});
