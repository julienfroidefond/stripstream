import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { KomgaSeries } from "@/types/komga";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";
import logger from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const seriesId: string = (await params).seriesId;

    const series: KomgaSeries = await SeriesService.getSeries(seriesId);
    return NextResponse.json(series);
  } catch (error) {
    logger.error({ err: error }, "API Series - Erreur:");
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Series fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.SERIES.FETCH_ERROR,
          name: "Series fetch error",
          message: getErrorMessage(ERROR_CODES.SERIES.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
