import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { KomgaSeries } from "@/types/komga";
import { getErrorMessage } from "@/utils/errors";

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
          message: getErrorMessage(ERROR_CODES.SERIES.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
