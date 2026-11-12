/**
 * The reader's page-move policy: initial page, previous/next landing, the
 * start-of-book bump, the end-of-book fallback and guarded page jumps.
 *
 * It is pure so `usePageNavigation` only applies decisions to React state, the
 * read-progress session and the router. The double-page predicate is injected:
 * the policy asks where a spread begins, it does not know the reader geometry.
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

function pageStep(state: PageMoveState, direction: PageMoveDirection): number {
  if (!state.isDoublePage) return 1;
  // A spread starts on the page the reader is about to show. Going backward,
  // ask about the spread two pages earlier so page 2 returns to the cover.
  const anchor = direction === "previous" ? state.currentPage - 2 : state.currentPage;
  return state.shouldShowDoublePage(anchor) ? 2 : 1;
}

export function planPageMove(
  direction: PageMoveDirection,
  state: PageMoveState
): PageMove {
  if (direction === "previous") {
    if (state.currentPage <= 1) return { kind: "start-bump" };
    return {
      kind: "page",
      page: Math.max(1, state.currentPage - pageStep(state, direction)),
    };
  }

  if (state.currentPage >= state.totalPages) {
    return state.nextBookId
      ? { kind: "next-book", bookId: state.nextBookId }
      : { kind: "end" };
  }

  return {
    kind: "page",
    page: Math.min(state.totalPages, state.currentPage + pageStep(state, direction)),
  };
}

export function planPageJump(targetPage: number, totalPages: number): PageJump {
  if (targetPage < 1 || targetPage > totalPages) {
    return { kind: "out-of-bounds", page: targetPage };
  }
  return { kind: "page", page: targetPage };
}
