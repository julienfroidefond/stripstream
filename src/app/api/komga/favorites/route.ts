import { NextResponse } from "next/server";
import { FavoriteService } from "@/lib/services/favorite.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";

export async function GET() {
  try {
    const favoriteIds: string[] = await FavoriteService.getAllFavoriteIds();
    return NextResponse.json(favoriteIds);
  } catch (error) {
    console.error("Erreur lors de la récupération des favoris:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Favorite fetch error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.FAVORITE.FETCH_ERROR,
          name: "Favorite fetch error",
          message: getErrorMessage(ERROR_CODES.FAVORITE.FETCH_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { seriesId }: { seriesId: string } = await request.json();
    await FavoriteService.addToFavorites(seriesId);
    return NextResponse.json({ message: "⭐️ Série ajoutée aux favoris" });
  } catch (error) {
    console.error("Erreur lors de l'ajout du favori:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Favorite add error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.FAVORITE.ADD_ERROR,
          name: "Favorite add error",
          message: getErrorMessage(ERROR_CODES.FAVORITE.ADD_ERROR),
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { seriesId }: { seriesId: string } = await request.json();
    await FavoriteService.removeFromFavorites(seriesId);
    return NextResponse.json({ message: "💔 Série retirée des favoris" });
  } catch (error) {
    console.error("Erreur lors de la suppression du favori:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Favorite delete error",
            message: getErrorMessage(error.code),
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.FAVORITE.DELETE_ERROR,
          name: "Favorite delete error",
          message: getErrorMessage(ERROR_CODES.FAVORITE.DELETE_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
