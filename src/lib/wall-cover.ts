import type { NormalizedSeries } from "@/lib/providers/types";
import type { WallItem } from "@/types/wall";
import {
  buildWallLayout,
  hashId,
  visibleWallTiles,
} from "@/lib/wall-layout";

/**
 * Série minimale attendue par `SeriesCover` : le mur ne transporte que ces
 * champs, on les remet dans la forme attendue par la couverture.
 */
export function wallItemToSeries(item: WallItem): NormalizedSeries {
  return {
    id: item.id,
    name: item.name,
    bookCount: item.bookCount,
    booksReadCount: item.booksReadCount,
    thumbnailUrl: item.thumbnailUrl,
    summary: item.summary,
    authors: item.authors.map((name) => ({ name, role: "" })),
    genres: item.genres,
    tags: [],
    startYear: item.startYear,
    missingCount: item.missingCount,
    seriesStatus: item.seriesStatus,
    communityScore: item.communityScore,
  };
}

/**
 * Cadre de référence pour précharger les couvertures du centre du motif.
 *
 * Le serveur ne connaît pas encore la taille de la fenêtre du navigateur, mais
 * le mur s'ouvre toujours sur le centre de la plaque. On prend donc une fenêtre
 * raisonnable au centre : les couvertures visibles sur desktop comme sur mobile
 * y sont, et on n'envoie pas tout le mur en préchargement.
 */
const PRELOAD_VIEWPORT = { width: 960, height: 640 } as const;
const PRELOAD_MAX_URLS = 16;

/**
 * Couvertures du centre du mur, dans l'ordre où elles seront regardées.
 *
 * Appelée au rendu du composant client (donc aussi pendant le SSR), elle
 * permet de poser des `<link rel="preload">` avant l'hydratation : les images
 * commencent à descendre pendant le chargement du JS, au lieu d'attendre que
 * les premières tuiles soient montées.
 */
export function wallPreloadUrls(
  items: readonly WallItem[],
  limit = PRELOAD_MAX_URLS
): string[] {
  if (items.length === 0 || limit <= 0) return [];

  const layout = buildWallLayout("all");
  const camera = {
    x: PRELOAD_VIEWPORT.width / 2 - layout.width / 2,
    y: PRELOAD_VIEWPORT.height / 2 - layout.height / 2,
    scale: 1,
    width: PRELOAD_VIEWPORT.width,
    height: PRELOAD_VIEWPORT.height,
  };
  const seedOffset =
    hashId(`all:${items.length}`) % Math.max(1, items.length);
  const tiles = visibleWallTiles(
    layout,
    camera,
    items.length,
    seedOffset,
    0
  );

  // Le centre d'abord : c'est là que le regard se pose à l'ouverture.
  const centerX = layout.width / 2;
  const centerY = layout.height / 2;
  const ordered = tiles
    .map((tile) => ({
      tile,
      distance: Math.hypot(
        tile.x + tile.width / 2 - centerX,
        tile.y + tile.height / 2 - centerY
      ),
    }))
    .sort(
      (first, second) =>
        first.distance - second.distance ||
        first.tile.key.localeCompare(second.tile.key)
    );

  const urls: string[] = [];
  const seen = new Set<string>();
  for (const { tile } of ordered) {
    const url = items[tile.itemIndex]?.thumbnailUrl;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= limit) break;
  }
  return urls;
}
