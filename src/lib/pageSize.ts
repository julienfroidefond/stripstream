export const COMFORTABLE_GRID_PAGE_SIZES = [30, 60, 90] as const;
export const COMPACT_GRID_PAGE_SIZES = [24, 48, 96] as const;

export function getGridPageSizeOptions(isCompact: boolean): readonly number[] {
  return isCompact ? COMPACT_GRID_PAGE_SIZES : COMFORTABLE_GRID_PAGE_SIZES;
}

export function normalizeGridPageSize(size: number | undefined, isCompact: boolean): number {
  const options = getGridPageSizeOptions(isCompact);

  if (size && options.includes(size)) {
    return size;
  }

  if (!size || Number.isNaN(size)) {
    return options[0];
  }

  return options.reduce((closest, option) =>
    Math.abs(option - size) < Math.abs(closest - size) ? option : closest
  );
}
