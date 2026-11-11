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
  | { kind: "book-page-thumbnail"; bookId: string; pageNumber: number }
  | { kind: "book-cover"; bookId: string }
  | { kind: "series-cover"; seriesId: string };

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

export interface MediaErrorPolicy {
  shape: "json" | "empty";
  /** `mapped` utilise la table de status du provider ; `always-500` conserve l'ancien contrat. */
  status: "mapped" | "always-500";
  /** Réponse dédiée quand l'amont répond 404 (image/cover). */
  notFound?: { code: ErrorCode; message: string; name?: string };
  fallback: { code: ErrorCode; message: string; name?: string };
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

export interface MediaRouteSpec {
  provider: ProviderType;
  ref: (
    params: Record<string, string>,
    request: Request
  ) => MediaRef | MediaRequestError;
  policy: MediaPolicy;
}

export interface MediaRouteDependencies {
  getCurrentUser: () => Promise<{ id: string } | null>;
  getTransport: (provider: ProviderType) => MediaTransport;
}
