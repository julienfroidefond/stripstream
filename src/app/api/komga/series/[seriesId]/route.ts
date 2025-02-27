import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";
import { KomgaSeries } from "@/types/komga";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { seriesId: string } }) {
  try {
    const series: KomgaSeries = await SeriesService.getSeries(params.seriesId);
    return NextResponse.json(series);
  } catch (error) {
    console.error("API Series - Erreur:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: ERROR_MESSAGES[error.code],
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.SERIES.FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.SERIES.FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
