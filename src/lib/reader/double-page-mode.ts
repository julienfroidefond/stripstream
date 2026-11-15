interface CanDisplayDoublePageOptions {
  isDoublePage: boolean;
  pageNumber: number;
  totalPages: number;
  screenWidth: number;
  screenHeight: number;
}

/**
 * Small screens stay in single-page mode, including when rotated: viewport
 * height can shrink below the threshold on tablets when browser chrome appears.
 */
export function canDisplayDoublePage({
  isDoublePage,
  pageNumber,
  totalPages,
  screenWidth,
  screenHeight,
}: CanDisplayDoublePageOptions): boolean {
  const shortScreenEdge = Math.min(screenWidth, screenHeight);

  return (
    isDoublePage &&
    shortScreenEdge >= 700 &&
    pageNumber !== 1 &&
    pageNumber < totalPages
  );
}
