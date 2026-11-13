/**
 * The reader's page-move policy: initial page, previous/next landing, the
 * start-of-book bump, the end-of-book fallback and guarded page jumps.
 *
 * It is pure so `usePageNavigation` only applies decisions to React state, the
 * read-progress session and the router. The double-page predicate is injected:
 * the policy asks where a spread begins, it does not know the reader geometry.
 * Spreads are aligned on even pages (the cover is alone) and a spread that
 * contains the last page is the end of the book.
 */

export type PageMoveDirection = "previous" | "next";

export type PageMove =
  | { kind: "page"; page: number }
  | { kind: "start-bump" }
  | { kind: "next-book"; bookId: string }
  | { kind: "end" };

export type PageJump =
  | { kind: "page"; page: number }
  | { kind: "out-of-bounds"; page: number };

export interface PageMoveState {
  currentPage: number;
  totalPages: number;
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  nextBookId?: string | null;
}

/** Resolves the page the reader opens on, clamped to the available pages. */
export function resolveInitialPage(
  savedPage: number | null | undefined,
  totalPages: number,
  anonymous: boolean
): number {
  if (anonymous || savedPage == null || savedPage < 1) return 1;
  return Math.max(1, Math.min(savedPage, totalPages));
}

/** What the policy needs to know about spreads, without the reader geometry. */
export type SpreadState = Pick<PageMoveState, "isDoublePage" | "shouldShowDoublePage">;

/** True when `page` is rendered as the left page of a two-page spread. */
export function isSpreadAt(page: number, spread: SpreadState): boolean {
  return spread.isDoublePage && spread.shouldShowDoublePage(page);
}

/** The last page on screen when the reader shows `page`. */
export function lastVisiblePage(page: number, spread: SpreadState): number {
  return isSpreadAt(page, spread) ? page + 1 : page;
}

/**
 * The page to record as reading progress for what is on screen: a spread
 * that contains the last page finishes the book, so it records `totalPages`.
 */
export function progressPageFor(
  page: number,
  totalPages: number,
  spread: SpreadState
): number {
  return totalPages > 0 && lastVisiblePage(page, spread) >= totalPages ? totalPages : page;
}

/**
 * The page a spread containing `page` starts on. Page 1 is alone (the cover),
 * so spreads are aligned on even pages: 2-3, 4-5… A page that cannot start
 * a spread (single mode, the last page of an even book) stays where it is.
 */
export function spreadStartFor(page: number, spread: SpreadState): number {
  if (!spread.isDoublePage || page <= 1) return page;
  const start = page % 2 === 0 ? page : page - 1;
  return start >= 2 && spread.shouldShowDoublePage(start) ? start : page;
}

export function planPageMove(
  direction: PageMoveDirection,
  state: PageMoveState
): PageMove {
  if (direction === "previous") {
    if (state.currentPage <= 1) return { kind: "start-bump" };
    // Land on the spread that ends right before the first visible page, so
    // going back from the last page (or after a jump) keeps the even pairs.
    return {
      kind: "page",
      page: Math.max(1, spreadStartFor(state.currentPage - 1, state)),
    };
  }

  // A spread that already shows the last page is the end of the book: there
  // is nothing left to turn to inside it.
  if (lastVisiblePage(state.currentPage, state) >= state.totalPages) {
    return state.nextBookId
      ? { kind: "next-book", bookId: state.nextBookId }
      : { kind: "end" };
  }

  return {
    kind: "page",
    page: Math.min(state.totalPages, lastVisiblePage(state.currentPage, state) + 1),
  };
}

/**
 * Validates a jump. With a spread state, the landing is the start of the
 * spread that contains the target, so the pairs stay aligned (a jump to the
 * last page of an odd book shows the final pair, not the page alone).
 */
export function planPageJump(
  targetPage: number,
  totalPages: number,
  spread?: SpreadState
): PageJump {
  if (targetPage < 1 || targetPage > totalPages) {
    return { kind: "out-of-bounds", page: targetPage };
  }
  return { kind: "page", page: spread ? spreadStartFor(targetPage, spread) : targetPage };
}
