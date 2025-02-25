import { NextResponse } from "next/server";
import { FavoriteService } from "@/lib/services/favorite.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";

export async function GET() {
  try {
    const favoriteIds = await FavoriteService.getAllFavoriteIds();
    return NextResponse.json(favoriteIds);
  } catch (error) {
    console.error("Erreur lors de la récupération des favoris:", error);
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
          code: ERROR_CODES.FAVORITE.FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.FAVORITE.FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { seriesId } = await request.json();
    await FavoriteService.addToFavorites(seriesId);
    return NextResponse.json({ message: "⭐️ Série ajoutée aux favoris" });
  } catch (error) {
    console.error("Erreur lors de l'ajout du favori:", error);
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
          code: ERROR_CODES.FAVORITE.ADD_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.FAVORITE.ADD_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { seriesId } = await request.json();
    await FavoriteService.removeFromFavorites(seriesId);
    return NextResponse.json({ message: "💔 Série retirée des favoris" });
  } catch (error) {
    console.error("Erreur lors de la suppression du favori:", error);
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
          code: ERROR_CODES.FAVORITE.DELETE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.FAVORITE.DELETE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
