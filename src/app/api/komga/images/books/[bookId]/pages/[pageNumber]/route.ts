import { NextRequest, NextResponse } from "next/server";
import { ImageService } from "@/lib/services/image.service";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { bookId: string; pageNumber: string } }
) {
  try {
    const { buffer, contentType } = await ImageService.getImage(
      `books/${params.bookId}/pages/${params.pageNumber}`
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la page du livre:", error);
    return new NextResponse("Erreur lors de la récupération de la page", { status: 500 });
  }
}
