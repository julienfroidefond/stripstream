import type { NormalizedBook, NormalizedSeries } from "@/lib/providers/types";

type HeroSummaryBook = Pick<NormalizedBook, "summary">;
type HeroSummarySeries = Pick<NormalizedSeries, "summary" | "genres" | "authors">;

/**
 * Résumé du hero « Reprendre la lecture ».
 *
 * Le résumé du tome est prioritaire : la description de la série ne sert de
 * repli que lorsque le tome n'en a pas (fournisseur qui ne renseigne que la
 * série, tome sans synopsis). Viennent ensuite les genres puis l'auteur, pour
 * ne jamais laisser la zone vide.
 */
export function resolveHeroSummary(
  book: HeroSummaryBook,
  series: HeroSummarySeries | null
): string | null {
  const fromBook = book.summary?.trim();
  if (fromBook) return fromBook;

  const fromSeries = series?.summary?.trim();
  if (fromSeries) return fromSeries;

  const genres = series?.genres?.filter(Boolean).slice(0, 3) ?? [];
  if (genres.length > 0) return genres.join(" • ");

  return series?.authors?.find((item) => item.name)?.name ?? null;
}
