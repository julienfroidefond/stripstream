import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverCacheService } from "@/lib/services/server-cache.service";

export async function GET(request: Request, { params }: { params: { seriesId: string } }) {
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

    // Récupérer les paramètres de pagination et de filtre depuis l'URL
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "0";
    const size = searchParams.get("size") || "24";
    const unreadOnly = searchParams.get("unread") === "true";

    // Clé de cache unique pour cette page de tomes
    const cacheKey = `series-${params.seriesId}-books-${page}-${size}-${unreadOnly}`;

    // Fonction pour récupérer les tomes
    const fetchBooks = async () => {
      // Construire l'URL avec les paramètres
      let url = `${config.serverUrl}/api/v1/series/${params.seriesId}/books?page=${page}&size=${size}&sort=metadata.numberSort,asc`;

      // Ajouter le filtre pour les tomes non lus et en cours si nécessaire
      if (unreadOnly) {
        url += "&read_status=UNREAD&read_status=IN_PROGRESS";
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.credentials.username}:${config.credentials.password}`
          ).toString("base64")}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          JSON.stringify({
            error: "Erreur lors de la récupération des tomes",
            details: errorData,
          })
        );
      }

      return response.json();
    };

    // Récupérer les données du cache ou faire l'appel API
    const data = await serverCacheService.getOrSet(cacheKey, fetchBooks, 5 * 60); // Cache de 5 minutes

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des tomes:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
