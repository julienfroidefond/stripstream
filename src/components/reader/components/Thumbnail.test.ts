// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({ default: { error: vi.fn() } }));

import { Thumbnail } from "./Thumbnail";
import type { ThumbnailProps } from "../types";

class VisibleObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
  unobserve = vi.fn();
  disconnect = vi.fn();
}

function props(overrides: Partial<ThumbnailProps> = {}): ThumbnailProps {
  return {
    pageNumber: 3,
    currentPage: 1,
    onPageChange: vi.fn(),
    getThumbnailUrl: (page) => `/thumb/${page}`,
    loadedThumbnails: {},
    onThumbnailLoad: vi.fn(),
    isVisible: true,
    ...overrides,
  };
}

describe("Thumbnail", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", VisibleObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not request a failed thumbnail again when another one loads", () => {
    const base = props();
    const view = render(createElement(Thumbnail, base));

    const img = view.container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/thumb/3");
    act(() => {
      fireEvent.error(img!);
    });
    expect(view.container.querySelector("img")).toBeNull();

    // Another thumbnail finished loading: the parent passes a new map.
    view.rerender(createElement(Thumbnail, { ...base, loadedThumbnails: { 4: true } }));
    view.rerender(createElement(Thumbnail, { ...base, loadedThumbnails: { 4: true, 5: true } }));

    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container.textContent).toContain("Erreur");
  });

  it("loads a new page after a failure", () => {
    const base = props();
    const view = render(createElement(Thumbnail, base));
    act(() => {
      fireEvent.error(view.container.querySelector("img")!);
    });

    view.rerender(createElement(Thumbnail, { ...base, pageNumber: 4 }));

    expect(view.container.querySelector("img")?.getAttribute("src")).toBe("/thumb/4");
  });
});
