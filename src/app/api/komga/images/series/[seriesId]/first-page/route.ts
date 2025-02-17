import { NextRequest, NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { seriesId: string } }) {
  try {
    const response = await SeriesService.getFirstPage(params.seriesId);
    return response;
  } catch (error) {
    console.error("Erreur lors de la récupération de la première page de la série:", error);
    return new NextResponse("Erreur lors de la récupération de l'image", { status: 500 });
  }
}
