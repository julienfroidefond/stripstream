import { NextRequest, NextResponse } from "next/server";
import { ImageService } from "@/lib/services/image.service";
import { SeriesService } from "@/lib/services/series.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { seriesId: string } }) {
  try {
    // Récupérer l'ID du premier livre
    const firstBookId = await SeriesService.getFirstBook(params.seriesId);

    // Récupérer la première page du premier livre
    const { buffer, contentType } = await ImageService.getImage(`books/${firstBookId}/pages/1`);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la première page de la série:", error);

    // En cas d'erreur, on essaie de récupérer le thumbnail comme fallback
    try {
      const { buffer, contentType } = await ImageService.getImage(
        `series/${params.seriesId}/thumbnail`
      );
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (fallbackError) {
      return new NextResponse("Erreur lors de la récupération de l'image", { status: 500 });
    }
  }
}
