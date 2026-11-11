import { ERROR_CODES } from "@/constants/errorCodes";

import type { MediaPolicy } from "./types";

const FILE_HEADERS = ["content-type", "content-disposition"] as const;
const IMAGE_HEADERS = [
  "content-type",
  "content-length",
  "etag",
  "last-modified",
] as const;

const IMAGE_NOT_FOUND = {
  code: ERROR_CODES.IMAGE.FETCH_ERROR,
  message: "Image not found",
  name: "Image not found",
} as const;

const IMAGE_FAILURE = {
  code: ERROR_CODES.IMAGE.FETCH_ERROR,
  message: "Image fetch error",
  name: "Image fetch error",
} as const;

/**
 * Les politiques de réponse vivent ici, pas dans les routes : un seul module
 * décide des en-têtes de cache, des validateurs et de la forme des erreurs.
 */
export const MEDIA_POLICIES = {
  komgaFile: {
    response: {
      cacheControl: "private, no-store",
      copyHeaders: FILE_HEADERS,
    },
    errors: {
      shape: "json",
      status: "mapped",
      fallback: {
        code: ERROR_CODES.KOMGA.HTTP_ERROR,
        message: "File download error",
      },
      log: "Komga file",
    },
  },
  komgaReaderPage: {
    response: {
      cacheControl: "public, max-age=31536000",
      copyHeaders: ["content-type"] as const,
      defaultContentType: "image/jpeg",
    },
    errors: {
      shape: "json",
      status: "always-500",
      fallback: IMAGE_FAILURE,
      log: "Komga reader page",
    },
  },
  komgaImage: {
    response: {
      cacheControl: "public, max-age=2592000, immutable",
      copyHeaders: IMAGE_HEADERS,
    },
    errors: {
      shape: "json",
      status: "always-500",
      notFound: IMAGE_NOT_FOUND,
      fallback: IMAGE_FAILURE,
      log: "Komga image",
    },
  },
  stripstreamFile: {
    response: {
      cacheControl: "private, no-store",
      copyHeaders: FILE_HEADERS,
    },
    errors: {
      shape: "json",
      status: "mapped",
      fallback: {
        code: ERROR_CODES.STRIPSTREAM.HTTP_ERROR,
        message: "File download error",
      },
      log: "Stripstream file",
    },
  },
  stripstreamPage: {
    response: {
      cacheControl: "public, max-age=86400",
      copyHeaders: IMAGE_HEADERS,
      defaultContentType: "image/jpeg",
    },
    errors: {
      shape: "json",
      status: "always-500",
      fallback: {
        code: ERROR_CODES.IMAGE.FETCH_ERROR,
        message: "Image fetch error",
      },
      log: "Stripstream page",
    },
  },
  stripstreamThumbnail: {
    response: {
      cacheControl: "public, max-age=2592000, immutable",
      copyHeaders: ["content-type", "etag", "last-modified"] as const,
      defaultContentType: "image/jpeg",
    },
    errors: {
      shape: "empty",
      status: "always-500",
      fallback: {
        code: ERROR_CODES.IMAGE.FETCH_ERROR,
        message: "Image fetch error",
      },
      log: "Stripstream thumbnail",
    },
  },
} satisfies Record<string, MediaPolicy>;
