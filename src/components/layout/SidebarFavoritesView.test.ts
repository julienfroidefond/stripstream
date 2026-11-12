// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NormalizedSeries } from "@/lib/providers/types";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/hooks/useTranslate", () => ({
  useTranslate: () => ({ t: (key: string) => key }),
}));

vi.mock("./SidebarNavContext", () => ({
  useSidebarNav: () => vi.fn(),
}));

vi.mock("@/components/ui/nav-button", async () => {
  const React = await import("react");
  return {
    NavButton: ({ label }: { label: string }) =>
      React.createElement("div", { "data-testid": "nav-button" }, label),
  };
});

import { SidebarFavoritesView } from "./SidebarFavoritesView";

const seriesA: NormalizedSeries = {
  id: "series-a",
  name: "Série A",
  bookCount: 10,
  booksReadCount: 0,
  thumbnailUrl: "",
  libraryId: "library-1",
};

const seriesB: NormalizedSeries = {
  id: "series-b",
  name: "Série B",
  bookCount: 5,
  booksReadCount: 0,
  thumbnailUrl: "",
  libraryId: "library-1",
};

const seriesC: NormalizedSeries = {
  id: "series-c",
  name: "Série C",
  bookCount: 3,
  booksReadCount: 0,
  thumbnailUrl: "",
  libraryId: "library-1",
};

function dispatchFavoriteChange(detail: {
  seriesId: string;
  action: "add" | "remove";
  series?: NormalizedSeries;
}) {
  window.dispatchEvent(new CustomEvent("favoritesChanged", { detail }));
}

describe("SidebarFavoritesView", () => {
  afterEach(() => {
    cleanup();
  });

  it("applique les ajouts et retraits optimistes sans refresh local", () => {
    const { rerender } = render(
      createElement(SidebarFavoritesView, { favorites: [seriesA] })
    );

    expect(screen.getByText("Série A")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();

    act(() => {
      dispatchFavoriteChange({
        seriesId: seriesB.id,
        action: "add",
        series: seriesB,
      });
    });

    expect(screen.getByText("Série B")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();

    act(() => {
      dispatchFavoriteChange({ seriesId: seriesA.id, action: "remove" });
    });

    expect(screen.queryByText("Série A")).toBeNull();
    expect(screen.getByText("Série B")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();

    // Une nouvelle liste serveur invalide les overrides locaux.
    rerender(createElement(SidebarFavoritesView, { favorites: [seriesB, seriesC] }));
    expect(screen.getByText("Série B")).toBeTruthy();
    expect(screen.getByText("Série C")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
  });
});
