import { NextResponse } from "next/server";
import { ConfigDBService } from "@/lib/services/config-db.service";

export async function GET() {
  try {
    const config = await ConfigDBService.getTTLConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration TTL:", error);
    if (error instanceof Error) {
      if (error.message === "Utilisateur non authentifié") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
    }
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la configuration TTL" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const config = await ConfigDBService.saveTTLConfig(data);
    return NextResponse.json({
      message: "Configuration TTL sauvegardée avec succès",
      config: {
        defaultTTL: config.defaultTTL,
        homeTTL: config.homeTTL,
        librariesTTL: config.librariesTTL,
        seriesTTL: config.seriesTTL,
        booksTTL: config.booksTTL,
        imagesTTL: config.imagesTTL,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la configuration TTL:", error);
    if (error instanceof Error && error.message === "Utilisateur non authentifié") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde de la configuration TTL" },
      { status: 500 }
    );
  }
}
