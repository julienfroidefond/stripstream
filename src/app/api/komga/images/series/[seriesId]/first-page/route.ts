import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import { findHttpStatus } from "@/utils/image-errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const seriesId: string = (await params).seriesId;

    const response = await SeriesService.getCover(seriesId);
    return response;
  } catch (error) {
    console.error("Erreur lors de la récupération de la couverture de la série:", error);
    
    // Chercher un status HTTP 404 dans la chaîne d'erreurs
    const httpStatus = findHttpStatus(error);
    
    if (httpStatus === 404) {
      const seriesId: string = (await params).seriesId;
      // eslint-disable-next-line no-console
      console.log(`📷 First page image not found for series: ${seriesId}`);
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.IMAGE.FETCH_ERROR,
            name: "Image not found",
            message: "Image not found",
          },
        },
        { status: 404 }
      );
    }
    
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
