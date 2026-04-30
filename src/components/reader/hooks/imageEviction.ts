/**
 * Pure helper: compute which numeric image keys should be evicted from the
 * cache, given the current page and a window of [current - behind, current + ahead].
 * Non-numeric keys (e.g. "next-1" for next-book pages) are ignored, and any key
 * whose fetch is currently pending is preserved.
 */
export function computeEvictionKeys(
  cachedKeys: ReadonlyArray<string | number>,
  currentPage: number,
  behind: number,
  ahead: number,
  pendingKeys: ReadonlySet<string | number>
): number[] {
  const minKeep = currentPage - behind;
  const maxKeep = currentPage + ahead;
  const toEvict: number[] = [];

  for (const key of cachedKeys) {
    const num = typeof key === "number" ? key : Number(key);
    if (Number.isNaN(num)) continue;
    if (pendingKeys.has(num) || pendingKeys.has(String(num))) continue;
    if (num < minKeep || num > maxKeep) toEvict.push(num);
  }

  return toEvict;
}
