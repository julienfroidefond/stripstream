import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";
import { StripstreamClient } from "@/lib/providers/stripstream/stripstream.client";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import logger from "@/lib/logger";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: { code: "AUTH_UNAUTHENTICATED" } }, { status: 401 });
    }

    const userId = parseInt(user.id, 10);
    const config = await prisma.stripstreamConfig.findUnique({ where: { userId } });
    if (!config) {
      throw new AppError(ERROR_CODES.STRIPSTREAM.MISSING_CONFIG);
    }

    const client = new StripstreamClient(config.url, config.token);
    const response = await client.fetchImage(`books/${bookId}/thumbnail`);

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Stripstream thumbnail fetch error");
    return new NextResponse(null, { status: 404 });
  }
}
