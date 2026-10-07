import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers/provider.factory";
import { AppError, getErrorMessage } from "@/utils/errors";
import { ERROR_CODES } from "@/constants/errorCodes";

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 10;

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const limitParam = request.nextUrl.searchParams.get("limit");
    const parsedLimit = limitParam ? Number(limitParam) : Number.NaN;
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(parsedLimit, MAX_LIMIT))
      : DEFAULT_LIMIT;

    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json([], { headers: { "Cache-Control": "no-store" } });
    }

    const provider = await getProvider();
    if (!provider) {
      throw new AppError(ERROR_CODES.STRIPSTREAM.MISSING_CONFIG);
    }

    const results = await provider.search(query, limit);

    return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: getErrorMessage(error.code) } },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: { code: ERROR_CODES.CLIENT.FETCH_ERROR, message: "Search error" } },
      { status: 500 }
    );
  }
}
