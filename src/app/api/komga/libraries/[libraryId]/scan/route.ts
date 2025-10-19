import { NextResponse } from "next/server";
import { LibraryService } from "@/lib/services/library.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string }> }
) {
  try {
    const libraryId: string = (await params).libraryId;
    
    // Scan library with deep=false
    await LibraryService.scanLibrary(libraryId, false);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Library Scan - Erreur:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Library scan error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.LIBRARY.SCAN_ERROR,
          name: "Library scan error",
          message: getErrorMessage(ERROR_CODES.LIBRARY.SCAN_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

