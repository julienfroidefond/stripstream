import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/auth-utils";
import { getActiveConnection } from "@/lib/active-connection";
import { getResolvedStripstreamConfig } from "@/lib/providers/stripstream/stripstream-config-resolver";
import { StripstreamClient } from "@/lib/providers/stripstream/stripstream.client";
import { AppError } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";
import { isConnectionError } from "@/utils/http-error";
import { requestDeduplicationService } from "@/lib/services/request-deduplication.service";
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

    const connectionKey = createHash("sha256")
      .update(`${config.url}\0${config.token}`)
      .digest("hex");
    const { buffer, contentType } = await requestDeduplicationService.deduplicate(
      `stripstream-thumbnail:${connectionKey}:${bookId}`,
      async () => {
        const client = new StripstreamClient(config.url, config.token);
        const response = await client.fetchImage(`books/${bookId}/thumbnail`);
        return {
          buffer: await response.arrayBuffer(),
          contentType: response.headers.get("content-type") ?? "image/jpeg",
        };
      }
    );

    return new NextResponse(buffer.slice(0), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, immutable",
        // The bytes depend on the authenticated browser's active connection.
        // Keep browser cache entries isolated when a user switches provider/config.
        Vary: "Cookie",
      },
    });
  } catch (error) {
    if (isConnectionError(error)) {
      logger.warn({ err: error }, "Stripstream thumbnail fetch error (provider unreachable)");
    } else {
      logger.error({ err: error }, "Stripstream thumbnail fetch error");
    }
    return new NextResponse(null, { status: 404 });
  }
}
