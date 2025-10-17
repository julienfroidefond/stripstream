import { NextResponse } from "next/server";
import { LibraryService } from "@/lib/services/library.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { KomgaLibrary } from "@/types/komga";
import { getErrorMessage } from "@/utils/errors";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const libraries: KomgaLibrary[] = await LibraryService.getLibraries();
    return NextResponse.json(libraries);
  } catch (error) {
    if (error instanceof AppError) {
      // Si la config Komga n'existe pas, retourner un tableau vide au lieu d'une erreur
      if (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG) {
        return NextResponse.json([]);
      }
    }
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
