import { NextResponse } from "next/server";
import { HomeService } from "@/lib/services/home.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await HomeService.getHomeData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("API Home - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
