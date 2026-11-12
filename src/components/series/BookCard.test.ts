// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NormalizedBook } from "@/lib/providers/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
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

vi.mock("@/components/ui/mark-as-read-button", async () => {
  const React = await import("react");
  return {
    MarkAsReadButton: ({ onSuccess }: { onSuccess?: () => void }) =>
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": "mark-as-read",
          onClick: onSuccess,
        },
        "read"
      ),
  };
});

vi.mock("@/components/ui/mark-as-unread-button", async () => {
  const React = await import("react");
  return {
    MarkAsUnreadButton: ({ onSuccess }: { onSuccess?: () => void }) =>
      React.createElement(
        "button",
        {
          type: "button",
          "data-testid": "mark-as-unread",
          onClick: onSuccess,
        },
        "unread"
      ),
  };
});

import { BookCard } from "./BookCard";

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
});

afterEach(() => {
  cleanup();
});

describe.each(["grid", "list"] as const)("%s book card", (layout) => {
  it("refreshes the route once after marking the book as read", async () => {
    render(
      createElement(BookCard, {
        book: baseBook,
        layout,
        onBookClick: vi.fn(),
      })
    );

    fireEvent.click(screen.getByTestId("mark-as-read"));

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("refreshes the route once after marking the book as unread", async () => {
    const readBook: NormalizedBook = {
      ...baseBook,
      readProgress: { page: 100, completed: true, lastReadAt: null },
    };

    render(
      createElement(BookCard, {
        book: readBook,
        layout,
        onBookClick: vi.fn(),
      })
    );

    fireEvent.click(screen.getByTestId("mark-as-unread"));

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("renders the missing placeholder without actions", () => {
    const missingBook: NormalizedBook = {
      ...baseBook,
      thumbnailUrl: "",
      volumeType: "_missing",
    };

    render(
      createElement(BookCard, {
        book: missingBook,
        layout,
        onBookClick: vi.fn(),
      })
    );

    expect(screen.getByText("books.missingLabel")).toBeTruthy();
    expect(screen.queryByTestId("mark-as-read")).toBeNull();
    expect(screen.queryByTestId("mark-as-unread")).toBeNull();
  });
});
