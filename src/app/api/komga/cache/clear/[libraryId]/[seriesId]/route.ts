import { NextResponse } from "next/server";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { LibraryService } from "@/lib/services/library.service";
import { HomeService } from "@/lib/services/home.service";
import { SeriesService } from "@/lib/services/series.service";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ libraryId: string; seriesId: string }> }
) {
  try {
    const { libraryId, seriesId } = await params;

    await HomeService.invalidateHomeCache();
    revalidatePath("/");

    if (libraryId) {
      await LibraryService.invalidateLibrarySeriesCache(libraryId);
      revalidatePath(`/library/${libraryId}`);
    }

    if (seriesId) {
      await SeriesService.invalidateSeriesBooksCache(seriesId);
      await SeriesService.invalidateSeriesCache(seriesId);
      revalidatePath(`/series/${seriesId}`);
    }

    return NextResponse.json({ message: "🧹 Cache vidé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du cache:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.CACHE.CLEAR_ERROR,
          name: "Cache clear error",
          message: getErrorMessage(ERROR_CODES.CACHE.CLEAR_ERROR),
        },
      },
      { status: 500 }
    );
  }
}
