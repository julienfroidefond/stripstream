import { NextResponse } from "next/server";
import { SeriesService } from "@/lib/services/series.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { seriesId: string } }) {
  try {
    const series = await SeriesService.getSeries(params.seriesId);
    return NextResponse.json(series);
  } catch (error) {
    console.error("API Series - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la série" },
      { status: 500 }
    );
  }
}
