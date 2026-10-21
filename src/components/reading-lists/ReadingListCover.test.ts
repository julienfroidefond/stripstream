// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ReadingListCover } from "./ReadingListCover";

const BOOK_ID = "2b7c1c3e-5b0f-4a3e-9d0e-1f2a3b4c5d6e";
const BOOK_COVER = `/api/stripstream/images/books/${BOOK_ID}/thumbnail`;
const RAW_COVER = "https://covers.example/series.jpg";

function renderCover(covers: string[]) {
  return render(createElement(ReadingListCover, { covers, alt: "Liste" }));
}

function coverImage(): HTMLImageElement {
  return screen.getByAltText("Liste") as HTMLImageElement;
}

describe("ReadingListCover", () => {
  afterEach(() => cleanup());

  it("routes a book UUID through the thumbnail proxy", () => {
    renderCover([BOOK_ID]);
    expect(coverImage().getAttribute("src")).toBe(BOOK_COVER);
  });

  it("uses the raw cover URL of a series without a book", () => {
    renderCover([RAW_COVER]);
    expect(coverImage().getAttribute("src")).toBe(RAW_COVER);
  });

  it("falls through to the next preview when a cover fails", () => {
    renderCover([BOOK_ID, RAW_COVER]);

    fireEvent.error(coverImage());

    expect(coverImage().getAttribute("src")).toBe(RAW_COVER);
  });

  it("skips duplicate previews so the fallthrough cannot stall", () => {
    renderCover([BOOK_ID, BOOK_ID, RAW_COVER]);

    fireEvent.error(coverImage());

    expect(coverImage().getAttribute("src")).toBe(RAW_COVER);
  });

  it("renders the neutral placeholder when every preview fails", () => {
    const { container } = renderCover([BOOK_ID, RAW_COVER]);

    fireEvent.error(coverImage());
    fireEvent.error(coverImage());

    expect(screen.queryByAltText("Liste")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
