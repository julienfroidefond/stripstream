import type { ErrorCode } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";

/**
 * Une référence média décrit *ce que* le client demande, sans connaître le
 * chemin propre au provider. Le transport traduit cette référence en requête
 * amont ; l'adaptateur de route décide de la réponse cliente.
 */
export type MediaRef =
  | { kind: "book-file"; bookId: string }
  | {
      kind: "book-page";
      bookId: string;
      /** Numéro de page côté client, base 1. */
      pageNumber: number;
      /** Query string brute conservée pour le provider Stripstream. */
      query?: string;
    }
  | {
      kind: "book-page-thumbnail";
      bookId: string;
      /** Numéro de page côté client, base 1. */
      pageNumber: number;
    }
  | { kind: "book-cover"; bookId: string }
  | { kind: "series-cover"; seriesId: string };

export type MediaKind = MediaRef["kind"];
export type MediaRefOf<K extends MediaKind> = Extract<MediaRef, { kind: K }>;

export interface MediaTransportContext {
  /** En-têtes de la requête cliente ; seuls les validateurs conditionnels sont relayés. */
  headers: Headers;
}

export interface MediaTransport {
  fetch(ref: MediaRef, context: MediaTransportContext): Promise<Response>;
}

export type MediaHeader =
  | "content-type"
  | "content-length"
  | "content-disposition"
  | "etag"
  | "last-modified";

export interface MediaResponsePolicy {
  cacheControl: string;
  copyHeaders: readonly MediaHeader[];
  defaultContentType?: string;
}

/**
 * Code de repli d'une erreur non typée : un code fixe, ou `provider-http-error`
 * pour le code HTTP générique du provider qui sert la route
 * (`KOMGA_HTTP_ERROR` / `STRIPSTREAM_HTTP_ERROR`).
 */
export type MediaFallbackCode = ErrorCode | "provider-http-error";

export interface MediaErrorPolicy {
  /** `mapped` utilise la table de status du provider ; `always-500` masque l'origine. */
  status: "mapped" | "always-500";
  /** Réponse dédiée quand l'amont répond 404 (image/cover). */
  notFound?: { code: ErrorCode; message: string; name?: string };
  fallback: { code: MediaFallbackCode; message: string; name?: string };
  log: string;
}

export interface MediaPolicy {
  response: MediaResponsePolicy;
  errors: MediaErrorPolicy;
}

export interface MediaRequestError {
  error: {
    status: number;
    code: ErrorCode;
    message: string;
    name?: string;
  };
}

/**
 * Une route média est entièrement décrite par son provider et le kind servi :
 * la forme des paramètres, la politique et la forme d'erreur en découlent.
 */
export interface MediaRouteSpec {
  provider: ProviderType;
  kind: MediaKind;
}

export interface MediaRouteDependencies {
  getCurrentUser: () => Promise<{ id: string } | null>;
  getTransport: (provider: ProviderType) => MediaTransport;
}
