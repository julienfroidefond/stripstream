import { NextResponse } from "next/server";
import { LibraryService } from "@/lib/services/library.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { KomgaLibrary } from "@/types/komga";
import { getErrorMessage } from "@/utils/errors";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const libraries: KomgaLibrary[] = await LibraryService.getLibraries();
    return NextResponse.json(libraries);
  } catch (error) {
    console.error("API Libraries - Erreur:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Library fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.LIBRARY.FETCH_ERROR,
          name: "Library fetch error",
          message: getErrorMessage(ERROR_CODES.LIBRARY.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
