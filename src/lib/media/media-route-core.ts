import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";
import { AppError, getErrorMessage } from "@/utils/errors";
import { findHttpStatus } from "@/utils/image-errors";
import { isConnectionError } from "@/utils/http-error";
import logger from "@/lib/logger";

import { mediaPolicy } from "./policies";
import type {
  MediaErrorPolicy,
  MediaKind,
  MediaPolicy,
  MediaRef,
  MediaRequestError,
  MediaResponsePolicy,
  MediaRouteDependencies,
  MediaRouteSpec,
} from "./types";

const PROVIDER_HTTP_ERROR: Record<ProviderType, ErrorCode> = {
  komga: ERROR_CODES.KOMGA.HTTP_ERROR,
  stripstream: ERROR_CODES.STRIPSTREAM.HTTP_ERROR,
};

const PROVIDER_STATUS: Record<
  ProviderType,
  Partial<Record<ErrorCode, number>>
> = {
  komga: {
    [ERROR_CODES.AUTH.UNAUTHENTICATED]: 401,
    [ERROR_CODES.KOMGA.UNAUTHORIZED]: 401,
    [ERROR_CODES.KOMGA.FORBIDDEN]: 403,
    [ERROR_CODES.KOMGA.NOT_FOUND]: 404,
    [ERROR_CODES.KOMGA.SERVER_ERROR]: 500,
  },
  stripstream: {
    [ERROR_CODES.AUTH.UNAUTHENTICATED]: 401,
    [ERROR_CODES.STRIPSTREAM.UNAUTHORIZED]: 401,
    [ERROR_CODES.STRIPSTREAM.FORBIDDEN]: 403,
    [ERROR_CODES.STRIPSTREAM.NOT_FOUND]: 404,
    [ERROR_CODES.STRIPSTREAM.SERVER_ERROR]: 500,
  },
};

function jsonError(
  error: MediaRequestError["error"],
  status = error.status
): Response {
  return Response.json(
    {
      error: {
        code: error.code,
        ...(error.name ? { name: error.name } : {}),
        message: error.message,
      },
    },
    { status }
  );
}

export function mediaRouteError(
  status: number,
  code: ErrorCode,
  name?: string
): MediaRequestError {
  return {
    error: {
      status,
      code,
      message: getErrorMessage(code),
      name,
    },
  };
}

/** Valide un numéro de page de route en conservant le contrat historique. */
export function parseMediaPageNumber(value: string): number | null {
  const pageNumber = Number.parseInt(value, 10);
  return Number.isNaN(pageNumber) || pageNumber < 0 ? null : pageNumber;
}

const INVALID_PAGE_ERROR: Record<"book-page" | "book-page-thumbnail", ErrorCode> = {
  "book-page": ERROR_CODES.IMAGE.FETCH_ERROR,
  "book-page-thumbnail": ERROR_CODES.BOOK.PAGES_FETCH_ERROR,
};

/**
 * Inverse de `mediaUrl` : relit les paramètres d'une route déclarée par
 * `MEDIA_ROUTE_PATTERNS` (déjà décodés par Next) et la query brute.
 */
export function parseMediaRef(
  kind: MediaKind,
  params: Record<string, string>,
  url: URL
): MediaRef | MediaRequestError {
  switch (kind) {
    case "book-file":
    case "book-cover":
      return { kind, bookId: params.bookId };
    case "series-cover":
      return { kind, seriesId: params.seriesId };
    case "book-page":
    case "book-page-thumbnail": {
      const pageNumber = parseMediaPageNumber(params.pageNumber);
      if (pageNumber === null) {
        return mediaRouteError(400, INVALID_PAGE_ERROR[kind], "Image fetch error");
      }
      if (kind === "book-page-thumbnail") {
        return { kind, bookId: params.bookId, pageNumber };
      }
      const query = url.search.slice(1);
      return {
        kind,
        bookId: params.bookId,
        pageNumber,
        ...(query ? { query } : {}),
      };
    }
  }
}

function statusForError(
  provider: ProviderType,
  policy: MediaErrorPolicy,
  error: unknown
): number {
  if (policy.status === "always-500") return 500;
  if (!(error instanceof AppError)) return 500;
  return PROVIDER_STATUS[provider][error.code] ?? 500;
}

function logMediaError(
  provider: ProviderType,
  policy: MediaErrorPolicy,
  error: unknown
): void {
  if (isConnectionError(error)) {
    logger.warn({ err: error, provider }, `${policy.log}: provider unreachable`);
    return;
  }
  logger.error({ err: error, provider }, `${policy.log}: request failed`);
}

function buildErrorResponse(
  provider: ProviderType,
  policy: MediaErrorPolicy,
  error: unknown
): Response {
  logMediaError(provider, policy, error);

  const upstreamStatus = findHttpStatus(error);
  if (policy.notFound && upstreamStatus === 404) {
    return jsonError({
      status: 404,
      code: policy.notFound.code,
      message: policy.notFound.message,
      name: policy.notFound.name,
    });
  }

  if (error instanceof AppError) {
    return jsonError({
      status: statusForError(provider, policy, error),
      code: error.code,
      message: getErrorMessage(error.code, error.params),
      name: policy.fallback.name,
    });
  }

  return jsonError({
    status: statusForError(provider, policy, error),
    code:
      policy.fallback.code === "provider-http-error"
        ? PROVIDER_HTTP_ERROR[provider]
        : policy.fallback.code,
    message: policy.fallback.message,
    name: policy.fallback.name,
  });
}

function buildMediaResponse(
  upstream: Response,
  policy: MediaResponsePolicy
): Response {
  const headers = new Headers({ "Cache-Control": policy.cacheControl });
  for (const name of policy.copyHeaders) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Un 304 n'a pas de corps : il ne porte que les validateurs et la politique
  // de cache, jamais un type de contenu par défaut.
  if (
    upstream.status !== 304 &&
    policy.defaultContentType &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", policy.defaultContentType);
  }

  if (upstream.status === 304) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}

/**
 * Cœur testable de la route média : aucune dépendance Next, le transport et
 * l'authentification sont injectés. `media-route.ts` branche les vraies
 * dépendances.
 */
export async function serveMedia(
  request: Request,
  provider: ProviderType,
  ref: MediaRef,
  policy: MediaPolicy,
  dependencies: MediaRouteDependencies
): Promise<Response> {
  const user = await dependencies.getCurrentUser();
  if (!user) {
    return jsonError({
      status: 401,
      code: ERROR_CODES.AUTH.UNAUTHENTICATED,
      message: getErrorMessage(ERROR_CODES.AUTH.UNAUTHENTICATED),
    });
  }

  try {
    const transport = dependencies.getTransport(provider);
    const upstream = await transport.fetch(ref, { headers: request.headers });
    return buildMediaResponse(upstream, policy.response);
  } catch (error) {
    return buildErrorResponse(provider, policy.errors, error);
  }
}

export function createMediaRouteWith(
  spec: MediaRouteSpec,
  dependencies: MediaRouteDependencies
) {
  return async function GET(
    request: Request,
    context: { params: Promise<Record<string, string>> }
  ): Promise<Response> {
    const params = await context.params;
    const ref = parseMediaRef(spec.kind, params, new URL(request.url));
    if ("error" in ref) {
      return jsonError(ref.error);
    }
    return serveMedia(
      request,
      spec.provider,
      ref,
      mediaPolicy(spec.provider, spec.kind),
      dependencies
    );
  };
}
