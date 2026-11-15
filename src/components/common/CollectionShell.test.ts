// @vitest-environment jsdom
import { createElement, createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CollectionShell } from "./CollectionShell";

vi.mock("@/hooks/useTranslate", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/ui/Pagination", () => ({
  Pagination: ({ currentPage, onPageChange }: { currentPage: number; onPageChange: (page: number) => void }) =>
    createElement(
      "button",
      { onClick: () => onPageChange(currentPage + 1) },
      "Next page"
    ),
}));

function createShellProps(currentPage: number, onPageChange: (page: number) => void) {
  return {
    children: createElement("p", null, `Page ${currentPage} results`),
    toolbar: createElement("div"),
    currentPage,
    totalPages: 3,
    pageSize: 20,
    totalElements: 60,
    showingKey: "series.display.showing",
    emptyText: "series.empty",
    pageKey: "series.display.page",
    busy: false,
    gridRef: createRef<HTMLDivElement>(),
    onPageChange,
  };
}

describe("CollectionShell pagination scroll", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("scrolls the results to the top after pagination changes the page", () => {
    const onPageChange = vi.fn();
    const props = createShellProps(1, onPageChange);
    const { rerender } = render(createElement(CollectionShell, props));
    const grid = props.gridRef.current;

    expect(grid).not.toBeNull();
    expect(grid?.scrollIntoView).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(createElement(CollectionShell, { ...props, currentPage: 2 }));

    expect(grid?.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
  });

  it("does not scroll for page updates unrelated to the pagination control", () => {
    const props = createShellProps(1, vi.fn());
    const { rerender } = render(createElement(CollectionShell, props));
    const grid = props.gridRef.current;

    rerender(createElement(CollectionShell, { ...props, currentPage: 2 }));

    expect(grid?.scrollIntoView).not.toHaveBeenCalled();
  });
});
