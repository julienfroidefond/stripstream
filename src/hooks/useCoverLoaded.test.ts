// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCoverLoaded } from "./useCoverLoaded";

function Harness() {
  const { ref, loaded, onLoad, onError } = useCoverLoaded();
  return createElement("img", {
    ref,
    src: "http://localhost/api/cover.jpg",
    alt: "cover",
    onLoad,
    onError,
    "data-loaded": String(loaded),
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

describe("useCoverLoaded", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("marks the cover as loaded on load", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();
    expect(image.dataset.retried).toBeUndefined();

    fireEvent.load(image);

    expect(image.dataset.loaded).toBe("true");
  });

  it("retries once with a cache-buster when a cover fails", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();
    fireEvent.error(image);

    expect(image.dataset.retried).toBe("1");
    expect(new URL(image.src).searchParams.get("retry")).not.toBeNull();
    expect(image.dataset.loaded).toBe("false");
  });

  it("does not retry twice for a cover that is really missing", () => {
    mockImageState({ complete: false, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();
    fireEvent.error(image);
    const retriedSrc = image.src;

    fireEvent.error(image);

    expect(image.src).toBe(retriedSrc);
  });

  it("retries on mount when the cached cover already failed", () => {
    mockImageState({ complete: true, naturalWidth: 0 });
    render(createElement(Harness));

    const image = getCover();

    expect(image.dataset.retried).toBe("1");
    expect(new URL(image.src).searchParams.get("retry")).not.toBeNull();
  });

  it("sets loaded on mount when the cached cover is already complete", () => {
    mockImageState({ complete: true, naturalWidth: 1 });
    render(createElement(Harness));

    const image = getCover();

    expect(image.dataset.loaded).toBe("true");
    expect(image.dataset.retried).toBeUndefined();
  });
});
