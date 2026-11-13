import { BOOK_PAGE_TOKEN } from "@/lib/providers/book-media";
import type { ProviderType } from "@/lib/providers/types";

import type { MediaKind, MediaRef, MediaRefOf } from "./types";

/**
 * Seule source de la forme des routes média (ADR 0027).
 *
 * Une route vit sous `/api/<provider>/<pattern>` ; les segments `[x]` sont
 * exactement les dossiers dynamiques de `src/app/api`. Les adapters et les
 * providers construisent leurs URL avec `mediaUrl` / `bookPageUrlTemplate`,
 * les fichiers `route.ts` se déclarent avec `createMediaRoute(provider, kind)`
 * et `media-url.test.ts` vérifie que chaque couple servi a son fichier et
 * que l'URL produite redonne la même référence.
 *
 * Les URL publiques déjà émises (préfixe par provider) sont conservées : un
 * navigateur qui les a en cache continue de les résoudre.
 */
export const MEDIA_ROUTE_PATTERNS = {
  "book-file": "books/[bookId]/file",
  "book-page": "images/books/[bookId]/pages/[pageNumber]",
  "book-page-thumbnail": "images/books/[bookId]/pages/[pageNumber]/thumbnail",
  "book-cover": "images/books/[bookId]/thumbnail",
  "series-cover": "images/series/[seriesId]/thumbnail",
} as const satisfies Record<MediaKind, string>;

/**
 * Kinds réellement servis par chaque provider. Stripstream n'a ni vignette de
 * page (la page sert de vignette) ni couverture de série (l'adapter prend la
 * couverture du premier livre).
 */
export const SERVED_MEDIA_KINDS = {
  komga: ["book-file", "book-page", "book-page-thumbnail", "book-cover", "series-cover"],
  stripstream: ["book-file", "book-page", "book-cover"],
} as const satisfies Record<ProviderType, readonly MediaKind[]>;

export type ServedMediaKind<P extends ProviderType> =
  (typeof SERVED_MEDIA_KINDS)[P][number];
export type ServedMediaRef<P extends ProviderType> = MediaRefOf<ServedMediaKind<P>>;

/** Motif complet d'une route, segments dynamiques compris. */
export function mediaRoutePattern(provider: ProviderType, kind: MediaKind): string {
  return `/api/${provider}/${MEDIA_ROUTE_PATTERNS[kind]}`;
}

function routeParams(ref: MediaRef): Record<string, string> {
  switch (ref.kind) {
    case "book-file":
    case "book-cover":
      return { bookId: ref.bookId };
    case "book-page":
    case "book-page-thumbnail":
      return { bookId: ref.bookId, pageNumber: String(ref.pageNumber) };
    case "series-cover":
      return { seriesId: ref.seriesId };
  }
}

function fillPattern(
  pattern: string,
  params: Record<string, string>,
  rawParams: ReadonlySet<string> = new Set()
): string {
  return pattern.replace(/\[(\w+)\]/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`Missing media route param "${name}" for ${pattern}`);
    }
    return rawParams.has(name) ? value : encodeURIComponent(value);
  });
}

/** URL locale qui sert `ref` chez `provider`. */
export function mediaUrl<P extends ProviderType>(
  provider: P,
  ref: ServedMediaRef<P>
): string {
  const media: MediaRef = ref;
  const path = fillPattern(mediaRoutePattern(provider, media.kind), routeParams(media));
  const query = media.kind === "book-page" && media.query ? `?${media.query}` : "";
  return `${path}${query}`;
}

/**
 * Gabarit d'URL de page pour `NormalizedBook.media` : le numéro de page reste
 * le jeton `{page}` (base 1) que `resolveBookMediaUrl` remplit côté lecteur.
 */
export function bookPageUrlTemplate<P extends ProviderType>(
  provider: P,
  kind: Extract<ServedMediaKind<P>, "book-page" | "book-page-thumbnail">,
  bookId: string
): string {
  return fillPattern(
    mediaRoutePattern(provider, kind),
    { bookId, pageNumber: BOOK_PAGE_TOKEN },
    new Set(["pageNumber"])
  );
}
