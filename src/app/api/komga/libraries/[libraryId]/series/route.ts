import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverCacheService } from "@/lib/services/server-cache.service";

export async function GET(request: Request, { params }: { params: { libraryId: string } }) {
  try {
    // Récupérer les credentials Komga depuis le cookie
    const configCookie = cookies().get("komgaCredentials");
    if (!configCookie) {
      return NextResponse.json({ error: "Configuration Komga manquante" }, { status: 401 });
    }

    let config;
    try {
      config = JSON.parse(atob(configCookie.value));
    } catch (error) {
      return NextResponse.json({ error: "Configuration Komga invalide" }, { status: 401 });
    }

    if (!config.credentials?.username || !config.credentials?.password) {
      return NextResponse.json({ error: "Credentials Komga manquants" }, { status: 401 });
    }

    // Récupérer les paramètres de pagination depuis l'URL
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "20";

    // Clé de cache unique pour cette page de séries
    const cacheKey = `library-${params.libraryId}-series-${page}-${size}`;

    // Fonction pour récupérer les séries
    const fetchSeries = async () => {
      const response = await fetch(
        `${config.serverUrl}/api/v1/series?library_id=${params.libraryId}&page=${page}&size=${size}`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${config.credentials.username}:${config.credentials.password}`
            ).toString("base64")}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          JSON.stringify({
            error: "Erreur lors de la récupération des séries",
            details: errorData,
          })
        );
      }

      return response.json();
    };

    // Récupérer les données du cache ou faire l'appel API
    const data = await serverCacheService.getOrSet(cacheKey, fetchSeries, 5 * 60); // Cache de 5 minutes

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des séries:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
