import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { getActiveConnection } from "@/lib/active-connection";
import { getResolvedStripstreamConfig } from "@/lib/providers/stripstream/stripstream-config-resolver";
import { StripstreamClient } from "@/lib/providers/stripstream/stripstream.client";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import { isConnectionError } from "@/utils/http-error";
import logger from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; pageNumber: string }> }
) {
  try {
    const { bookId, pageNumber } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: { code: "AUTH_UNAUTHENTICATED" } }, { status: 401 });
    }

    const userId = parseInt(user.id, 10);
    const activeConnection = await getActiveConnection(userId);
    if (activeConnection.provider !== "stripstream") {
      throw new AppError(ERROR_CODES.STRIPSTREAM.MISSING_CONFIG);
    }
    const config = await getResolvedStripstreamConfig(
      userId,
      activeConnection.configId ?? undefined
    );
    if (!config) {
      throw new AppError(ERROR_CODES.STRIPSTREAM.MISSING_CONFIG);
    }

    const queryString = request.nextUrl.search.slice(1); // strip leading '?'
    const path = `books/${bookId}/pages/${pageNumber}${queryString ? `?${queryString}` : ""}`;

    const client = new StripstreamClient(config.url, config.token);
    const response = await client.fetchImage(path, request.headers);

    const cacheHeaders = new Headers({
      "Cache-Control": "public, max-age=86400",
    });
    for (const header of ["etag", "last-modified"]) {
      const value = response.headers.get(header);
      if (value) cacheHeaders.set(header, value);
    }

    if (response.status === 304) {
      return new NextResponse(null, { status: 304, headers: cacheHeaders });
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const contentLength = response.headers.get("content-length");

    const headers = new Headers(cacheHeaders);
    headers.set("Content-Type", contentType);
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(response.body, { headers });
  } catch (error) {
    if (isConnectionError(error)) {
      logger.warn({ err: error }, "Stripstream page fetch error (provider unreachable)");
    } else {
      logger.error({ err: error }, "Stripstream page fetch error");
    }

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: getErrorMessage(error.code) } },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: { code: ERROR_CODES.IMAGE.FETCH_ERROR, message: "Image fetch error" } },
      { status: 500 }
    );
  }
}
