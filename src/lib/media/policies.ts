import { ERROR_CODES } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";

import type { MediaKind, MediaPolicy, MediaResponsePolicy } from "./types";

const FILE_HEADERS = ["content-type", "content-disposition"] as const;
const IMAGE_HEADERS = [
  "content-type",
  "content-length",
  "etag",
  "last-modified",
] as const;

/**
 * Une image est adressée par une URL stable (id de livre/série, numéro de
 * page) : son contenu ne change pas pour une même connexion. La réponse reste
 * `private` parce que la même URL est résolue contre la connexion choisie par
 * le cookie de session : un cache partagé ne doit jamais la servir à un autre
 * utilisateur.
 */
const IMMUTABLE_IMAGE: MediaResponsePolicy = {
  cacheControl: "private, max-age=2592000, immutable",
  copyHeaders: IMAGE_HEADERS,
  defaultContentType: "image/jpeg",
};

const IMAGE_ERRORS = {
  status: "always-500",
  notFound: {
    code: ERROR_CODES.IMAGE.FETCH_ERROR,
    message: "Image not found",
    name: "Image not found",
  },
  fallback: {
    code: ERROR_CODES.IMAGE.FETCH_ERROR,
    message: "Image fetch error",
    name: "Image fetch error",
  },
} as const;

function imagePolicy(log: string): MediaPolicy {
  return { response: IMMUTABLE_IMAGE, errors: { ...IMAGE_ERRORS, log } };
}

/**
 * Une politique par `MediaRef.kind`, pas par provider : la même référence
 * reçoit les mêmes en-têtes de cache et la même forme d'erreur quel que soit
 * le backend (ADR 0027).
 */
export const MEDIA_POLICIES = {
  "book-file": {
    response: {
      cacheControl: "private, no-store",
      copyHeaders: FILE_HEADERS,
    },
    errors: {
      status: "mapped",
      fallback: {
        code: "provider-http-error",
        message: "File download error",
      },
      log: "Book file",
    },
  },
  "book-page": imagePolicy("Book page"),
  "book-page-thumbnail": imagePolicy("Book page thumbnail"),
  "book-cover": imagePolicy("Book cover"),
  "series-cover": imagePolicy("Series cover"),
} satisfies Record<MediaKind, MediaPolicy>;

/**
 * Seul écart provider restant. Le transport Komga choisit la vignette ou la
 * première page selon la préférence `showThumbnails` de l'utilisateur, lue à
 * chaque requête : les octets d'une même URL changent donc avec la préférence.
 * La réponse est revalidée à chaque affichage (ETag/Last-Modified relayés à
 * Komga, 304 quand rien n'a changé) au lieu d'être figée trente jours.
 */
const PREFERENCE_DEPENDENT_COVER: MediaResponsePolicy = {
  ...IMMUTABLE_IMAGE,
  cacheControl: "private, max-age=3600",
};

const PROVIDER_OVERRIDES: Partial<
  Record<ProviderType, Partial<Record<MediaKind, MediaResponsePolicy>>>
> = {
  komga: {
    "book-cover": PREFERENCE_DEPENDENT_COVER,
    "series-cover": PREFERENCE_DEPENDENT_COVER,
  },
};

export function mediaPolicy(provider: ProviderType, kind: MediaKind): MediaPolicy {
  const policy = MEDIA_POLICIES[kind];
  const response = PROVIDER_OVERRIDES[provider]?.[kind];
  return response ? { ...policy, response } : policy;
}
