import { createHash } from "node:crypto";

/**
 * Constantes et helpers partagés par les transports média.
 *
 * Les deux providers parlent désormais au même `ProviderTransport` pour les
 * octets ; il ne reste ici que ce qui est propre au média : le type de contenu
 * demandé, les délais courts des images et la reconstruction d'une réponse
 * après déduplication (un `Response` ne peut être lu qu'une fois).
 */

export const IMAGE_ACCEPT = "image/jpeg, image/png, image/gif, image/webp, */*";
export const STRIPSTREAM_IMAGE_ACCEPT = "image/webp, image/jpeg, image/png, */*";
export const FILE_ACCEPT = "application/octet-stream, */*";

/** Un provider muet ne doit pas laisser une balise `<img>` en attente. */
export const IMAGE_TIMEOUT_MS = 20000;
/** Une page de lecture Stripstream peut être plus lourde qu'une couverture. */
export const PAGE_TIMEOUT_MS = 60000;
/** Les couvertures sont petites : inutile de laisser traîner la requête. */
export const THUMBNAIL_TIMEOUT_MS = 12000;
/** Un téléchargement de fichier peut être plus lent à démarrer. */
export const FILE_TIMEOUT_MS = 60000;

const BUFFERED_HEADERS = ["content-type", "etag", "last-modified"] as const;

export interface BufferedMediaResponse {
  status: number;
  headers: Headers;
  body: ArrayBuffer | null;
}

/**
 * Lit une réponse une seule fois pour que la déduplication puisse la partager
 * entre plusieurs appelants. On ne garde que les en-têtes média utiles : la
 * route applique ensuite sa politique de cache.
 */
export async function bufferMediaResponse(
  response: Response
): Promise<BufferedMediaResponse> {
  const headers = new Headers();
  for (const name of BUFFERED_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }

  return {
    status: response.status,
    headers,
    body: response.status === 304 ? null : await response.arrayBuffer(),
  };
}

export function rebuildMediaResponse(payload: BufferedMediaResponse): Response {
  return new Response(payload.body, {
    status: payload.status,
    headers: payload.headers,
  });
}

/**
 * Empreinte du validateur conditionnel. Le hash évite de faire porter à la clé
 * de déduplication un ETag arbitrairement long.
 */
export function validatorFingerprint(headers: Headers): string {
  const validator =
    headers.get("if-none-match") ??
    headers.get("if-modified-since") ??
    "none";
  return createHash("sha256").update(validator).digest("hex");
}
