import type { WallItem } from "@/types/wall";
import type { NormalizedSeries } from "@/lib/providers/types";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";
import { orderForWall } from "@/lib/wall-layout";

/**
 * Le Wall — collecte des œuvres.
 *
 * Le mur veut de la matière : on prend une page généreuse dans chaque
 * bibliothèque, on déduplique, on mélange de façon stable, puis on borne.
 * Une bibliothèque en erreur ne doit pas vider le mur : seules les erreurs
 * totales remontent, et l'utilisateur peut alors relancer la page.
 */

/** Assez de couvertures pour que le mur respire, sans noyer le premier rendu. */
const PER_LIBRARY_LIMIT = 120;
export const WALL_MAX_ITEMS = 420;

/** Les résumés viennent de bases hétérogènes : on nettoie avant le client. */
const SUMMARY_MAX_LENGTH = 1400;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

export function cleanWallSummary(summary: string | null | undefined): string | null {
  if (!summary) return null;

  const decoded = summary.replace(
    /&(?:nbsp|amp|quot|#39|apos|lt|gt);/gi,
    (entity) => ENTITIES[entity.toLowerCase()] ?? entity
  );

  let text = decoded
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li)>/gi, " ");

  // On répète la suppression : un balisage imbriqué ou malformé (`<<script>`)
  // peut reconstituer un tag après une première passe.
  let previousText: string;
  do {
    previousText = text;
    text = text.replace(/<[^>]+>/g, "");
  } while (text !== previousText);

  text = text
    // Le résumé est rendu comme du texte : aucun chevron ne doit survivre.
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;
  return text.length > SUMMARY_MAX_LENGTH ? `${text.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}…` : text;
}

export function toWallItem(series: NormalizedSeries, libraryName: string): WallItem {
  return {
    id: series.id,
    name: series.name,
    thumbnailUrl: series.thumbnailUrl,
    summary: cleanWallSummary(series.summary),
    authors: (series.authors ?? [])
      .map((author) => author.name?.trim())
      .filter((name): name is string => Boolean(name))
      .slice(0, 3),
    genres: (series.genres ?? [])
      .map((genre) => genre.trim())
      .filter(Boolean)
      .slice(0, 4),
    libraryName,
    bookCount: series.bookCount,
    booksReadCount: series.booksReadCount,
    startYear: series.startYear ?? null,
    seriesStatus: series.seriesStatus ?? null,
    missingCount: series.missingCount ?? null,
    communityScore: series.communityScore ?? null,
  };
}

/**
 * Récupère le fonds du mur dans la connexion active.
 *
 * @throws AppError(WALL_FETCH_ERROR) si aucune bibliothèque n'a pu répondre.
 */
export async function getWallItems(provider: IMediaProvider): Promise<WallItem[]> {
  const libraries = await provider.getLibraries();
  if (libraries.length === 0) return [];

  const settled = await Promise.allSettled(
    libraries.map(async (library) => {
      const page = await provider.getSeries(library.id, "1", PER_LIBRARY_LIMIT);
      return { library, series: page.items };
    })
  );

  const seen = new Set<string>();
  const items: WallItem[] = [];
  let succeeded = 0;
  let failure: unknown = null;

  for (const result of settled) {
    if (result.status === "rejected") {
      failure = result.reason;
      continue;
    }
    succeeded += 1;
    for (const series of result.value.series) {
      if (!series.thumbnailUrl || seen.has(series.id)) continue;
      seen.add(series.id);
      items.push(toWallItem(series, result.value.library.name));
    }
  }

  if (succeeded === 0) {
    logger.error({ err: failure }, "Le Wall : aucune bibliothèque n'a répondu");
    throw new AppError(ERROR_CODES.WALL.FETCH_ERROR);
  }

  if (failure) {
    logger.warn({ err: failure }, "Le Wall : une bibliothèque a échoué, le mur continue");
  }

  return orderForWall(items).slice(0, WALL_MAX_ITEMS);
}
