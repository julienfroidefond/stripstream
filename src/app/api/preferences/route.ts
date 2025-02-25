import { NextRequest, NextResponse } from "next/server";
import { PreferencesService } from "@/lib/services/preferences.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";

export async function GET() {
  try {
    const preferences = await PreferencesService.getPreferences();
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences:", error);
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
          code: ERROR_CODES.PREFERENCES.FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.PREFERENCES.FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const preferences = await request.json();
    const updatedPreferences = await PreferencesService.updatePreferences(preferences);
    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
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
          code: ERROR_CODES.PREFERENCES.UPDATE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.PREFERENCES.UPDATE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
