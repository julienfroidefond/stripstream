import { NextRequest, NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { seriesId: string } }) {
  try {
    const response = await SeriesService.getCover(params.seriesId);
    return response;
  } catch (error) {
    console.error("Erreur lors de la récupération de la couverture de la série:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Image fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.IMAGE.FETCH_ERROR,
          name: "Image fetch error",
          message: getErrorMessage(ERROR_CODES.IMAGE.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
