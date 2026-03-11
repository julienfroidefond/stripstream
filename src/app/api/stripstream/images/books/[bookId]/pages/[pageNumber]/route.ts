import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import { StripstreamClient } from "@/lib/providers/stripstream/stripstream.client";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

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
    const config = await prisma.stripstreamConfig.findUnique({ where: { userId } });
    if (!config) {
      throw new AppError(ERROR_CODES.STRIPSTREAM.MISSING_CONFIG);
    }

    const queryString = request.nextUrl.search.slice(1); // strip leading '?'
    const path = `books/${bookId}/pages/${pageNumber}${queryString ? `?${queryString}` : ""}`;

    const client = new StripstreamClient(config.url, config.token);
    const response = await client.fetchImage(path);

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Stripstream page fetch error");

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
