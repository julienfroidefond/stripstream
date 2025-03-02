import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { PreferencesService } from "@/lib/services/preferences.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { UserPreferences } from "@/types/preferences";
import { getErrorMessage } from "@/utils/errors";

export async function GET() {
  try {
    const preferences: UserPreferences = await PreferencesService.getPreferences();
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            name: "Preferences fetch error",
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
          name: "Preferences fetch error",
          code: ERROR_CODES.PREFERENCES.FETCH_ERROR,
          message: getErrorMessage(ERROR_CODES.PREFERENCES.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const preferences: UserPreferences = await request.json();
    const updatedPreferences: UserPreferences = await PreferencesService.updatePreferences(
      preferences
    );
    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            name: "Preferences update error",
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
          name: "Preferences update error",
          code: ERROR_CODES.PREFERENCES.UPDATE_ERROR,
          message: getErrorMessage(ERROR_CODES.PREFERENCES.UPDATE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
