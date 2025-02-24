import { NextResponse } from "next/server";
import { TestService } from "@/lib/services/test.service";
import { ConfigDBService } from "@/lib/services/config-db.service";

export async function POST() {
  try {
    const config = await ConfigDBService.getConfig();

    const { libraries } = await TestService.testConnection({
      serverUrl: config.url,
      authHeader: config.authHeader,
    });

    return NextResponse.json({
      message: "Connexion réussie",
      librariesCount: libraries.length,
    });
  } catch (error) {
    console.error("Erreur lors du test de connexion:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 400 }
    );
  }
}
