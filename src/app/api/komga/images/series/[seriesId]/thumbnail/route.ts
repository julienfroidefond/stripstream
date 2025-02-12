import { NextRequest, NextResponse } from "next/server";
import { ImageService } from "@/lib/services/image.service";

export async function GET(request: NextRequest, { params }: { params: { seriesId: string } }) {
  try {
    const { buffer, contentType } = await ImageService.getImage(
      `/api/v1/series/${params.seriesId}/thumbnail`
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la miniature de la série:", error);
    return new NextResponse("Erreur lors de la récupération de la miniature", { status: 500 });
  }
}
