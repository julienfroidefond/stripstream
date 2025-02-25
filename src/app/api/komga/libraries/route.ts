import { NextResponse } from "next/server";
import { LibraryService } from "@/lib/services/library.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const libraries = await LibraryService.getLibraries();
    return NextResponse.json(libraries);
  } catch (error) {
    console.error("API Libraries - Erreur:", error);
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
          code: ERROR_CODES.LIBRARY.FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.LIBRARY.FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
