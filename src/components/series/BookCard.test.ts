// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedBook } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateReadProgress: vi.fn(),
  deleteReadProgress: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({
      href,
      children,
      ...props
    }: {
      href: string;
      children: import("react").ReactNode;
      [key: string]: unknown;
    }) => React.createElement("a", { href, ...props }, children),
  };
});

vi.mock("@/hooks/useTranslate", () => ({
  useTranslate: () => ({
    t: (key: string, values?: { [key: string]: string | number }) => {
      if (key === "navigation.volume") return `Tome ${values?.number ?? ""}`;
      if (key === "books.coverLink") return `Lire ${values?.title ?? ""}`;
      if (key === "books.coverAlt") return `Couverture ${values?.title ?? ""}`;
      return key;
    },
  }),
}));

vi.mock("@/contexts/AnonymousContext", () => ({
  useAnonymous: () => ({ isAnonymous: false, toggleAnonymous: vi.fn() }),
}));

vi.mock("@/components/ui/book-cover", () => ({
  BookCover: () => null,
  getBookReadingStatusInfo: () => ({ label: "unread", className: "" }),
}));

vi.mock("@/components/ui/cover-card", async () => {
  const React = await import("react");
  return {
    CoverCard: ({
      cover,
      overlay,
      children,
    }: {
      cover: import("react").ReactNode;
      overlay?: import("react").ReactNode;
      children: import("react").ReactNode;
    }) => React.createElement("div", null, cover, overlay, children),
    CoverEdge: () => null,
  };
});

vi.mock("@/components/ui/book-cover-scene", async () => {
  const React = await import("react");
  return {
    BookCoverScene: ({ cover }: { cover: import("react").ReactNode }) =>
      React.createElement("div", null, cover),
  };
});

vi.mock("@/components/ui/download-book-button", () => ({
  DownloadBookButton: () => null,
}));

vi.mock("@/app/actions/read-progress", () => ({
  updateReadProgress: mocks.updateReadProgress,
  deleteReadProgress: mocks.deleteReadProgress,
  updateSeriesReadStatus: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/lib/motion/celebrate", () => ({ burst: vi.fn() }));

vi.mock("@/lib/logger", () => ({ default: { error: vi.fn() } }));

import { ReadProgressMutationsProvider } from "@/contexts/ReadProgressMutationsContext";
import { BookCard, type BookCardProps } from "./BookCard";
import type { DisplayBook } from "./bookGrouping";

function renderCard(props: BookCardProps) {
  return render(
    createElement(ReadProgressMutationsProvider, null, createElement(BookCard, props))
  );
}

function bookItem(book: NormalizedBook): DisplayBook {
  return { kind: "book", key: book.id, book };
}

const baseBook: NormalizedBook = {
  id: "book-1",
  libraryId: "library-1",
  title: "Tome 1",
  number: "1",
  seriesId: "series-1",
  seriesName: "Série",
  volume: 1,
  pageCount: 100,
  thumbnailUrl: "/cover.webp",
  media: { pageUrlTemplate: "", thumbnailUrlTemplate: "" },
  readProgress: { page: 0, completed: false, lastReadAt: null },
  volumeType: "regular",
  summary: null,
};

beforeEach(() => {
  mocks.refresh.mockClear();
  mocks.updateReadProgress.mockReset().mockResolvedValue({ success: true });
  mocks.deleteReadProgress.mockReset().mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
});

describe.each(["grid", "list"] as const)("%s book card", (layout) => {
  it("marks the book read through the seam, optimistically, and refreshes once", async () => {
    renderCard({ item: bookItem(baseBook), layout, onBookClick: vi.fn() });

    fireEvent.click(screen.getByTestId("mark-as-read"));

    // Optimiste : le livre est lu avant la réponse, le bouton disparaît.
    expect(screen.queryByTestId("mark-as-read")).toBeNull();
    expect(mocks.updateReadProgress).toHaveBeenCalledWith("book-1", 100, true, "series-1");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("marks the book unread through the seam and refreshes once", async () => {
    const readBook: NormalizedBook = {
      ...baseBook,
      readProgress: { page: 100, completed: true, lastReadAt: null },
    };

    renderCard({ item: bookItem(readBook), layout, onBookClick: vi.fn() });

    fireEvent.click(screen.getByTestId("mark-as-unread"));

    expect(mocks.deleteReadProgress).toHaveBeenCalledWith("book-1", "series-1");
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("restores the read button when the mutation fails", async () => {
    mocks.updateReadProgress.mockResolvedValueOnce({ success: false, message: "Refusé" });

    renderCard({ item: bookItem(baseBook), layout, onBookClick: vi.fn() });

    fireEvent.click(screen.getByTestId("mark-as-read"));

    await waitFor(() => expect(screen.getByTestId("mark-as-read")).toBeTruthy());
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("renders the missing placeholder without actions", () => {
    renderCard({
      item: {
        kind: "missing",
        key: "missing-2",
        title: "Tome 2",
        volume: 2,
        coverUrl: null,
      },
      layout,
      onBookClick: vi.fn(),
    });

    expect(screen.getByText("books.missingLabel")).toBeTruthy();
    expect(screen.getByText("Tome 2")).toBeTruthy();
    expect(screen.queryByTestId("mark-as-read")).toBeNull();
    expect(screen.queryByTestId("mark-as-unread")).toBeNull();
  });
});
