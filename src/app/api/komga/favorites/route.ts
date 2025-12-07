import { NextResponse } from "next/server";
import { FavoriteService } from "@/lib/services/favorite.service";
import { SeriesService } from "@/lib/services/series.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";
import logger from "@/lib/logger";

export async function GET() {
  try {
    const favoriteIds: string[] = await FavoriteService.getAllFavoriteIds();

    // Valider que chaque série existe encore dans Komga
    const validFavoriteIds: string[] = [];

    for (const seriesId of favoriteIds) {
      try {
        await SeriesService.getSeries(seriesId);
        validFavoriteIds.push(seriesId);
      } catch {
        // Si la série n'existe plus dans Komga, on la retire des favoris
        try {
          await FavoriteService.removeFromFavorites(seriesId);
        } catch {
          // Erreur silencieuse, la série reste dans les favoris
        }
      }
    }

    return NextResponse.json(validFavoriteIds);
  } catch (error) {
    if (error instanceof AppError) {
      // Si la config Komga n'existe pas, retourner un tableau vide au lieu d'une erreur
      if (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG) {
        return NextResponse.json([]);
      }
    }
    logger.error({ err: error }, "Erreur lors de la récupération des favoris:");
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
    logger.error({ err: error }, "Erreur lors de l'ajout du favori:");
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
    logger.error({ err: error }, "Erreur lors de la suppression du favori:");
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
