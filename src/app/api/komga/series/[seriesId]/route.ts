import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";

export async function GET(request: Request, { params }: { params: { seriesId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || "24");
    const unreadOnly = searchParams.get("unread") === "true";

    const [series, books] = await Promise.all([
      SeriesService.getSeries(params.seriesId),
      SeriesService.getSeriesBooks(params.seriesId, page, size, unreadOnly),
    ]);

    return NextResponse.json({ series, books });
  } catch (error) {
    console.error("API Series - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la série" },
      { status: 500 }
    );
  }
}
