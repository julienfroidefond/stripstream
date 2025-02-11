import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { config } from "@/lib/config";
import { cacheService } from "@/lib/services/cache.service";

export async function GET() {
  try {
    // Récupérer les credentials Komga depuis le cookie
    const cookieStore = cookies();
    const configCookie = cookieStore.get("komgaCredentials");
    console.log("API Home - Cookie komgaCredentials:", configCookie?.value);

    if (!configCookie) {
      console.log("API Home - Cookie komgaCredentials manquant");
      return NextResponse.json({ error: "Configuration Komga manquante" }, { status: 401 });
    }

    let komgaConfig;
    try {
      komgaConfig = JSON.parse(atob(configCookie.value));
      console.log("API Home - Config décodée:", {
        serverUrl: komgaConfig.serverUrl,
        hasCredentials: !!komgaConfig.credentials,
      });
    } catch (error) {
      console.error("API Home - Erreur de décodage du cookie:", error);
      return NextResponse.json({ error: "Configuration Komga invalide" }, { status: 401 });
    }

    if (!komgaConfig.credentials?.username || !komgaConfig.credentials?.password) {
      console.log("API Home - Credentials manquants dans la config");
      return NextResponse.json({ error: "Credentials Komga manquants" }, { status: 401 });
    }

    const auth = Buffer.from(
      `${komgaConfig.credentials.username}:${komgaConfig.credentials.password}`
    ).toString("base64");

    console.log("API Home - Début des appels API");

    try {
      // Appels API parallèles
      const [ongoingResponse, recentlyReadResponse, popularResponse] = await Promise.all([
        // Séries en cours
        fetch(
          `${komgaConfig.serverUrl}/api/v1/series?read_status=IN_PROGRESS&sort=readDate,desc&page=0&size=20&media_status=READY`,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
            cache: "no-store", // Désactiver le cache
          }
        ).catch((error) => {
          console.error("API Home - Erreur fetch ongoing:", error);
          throw error;
        }),
        // Derniers livres lus
        fetch(
          `${komgaConfig.serverUrl}/api/v1/books?read_status=READ&sort=readDate,desc&page=0&size=20`,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
            cache: "no-store", // Désactiver le cache
          }
        ).catch((error) => {
          console.error("API Home - Erreur fetch recently read:", error);
          throw error;
        }),
        // Séries populaires
        fetch(
          `${komgaConfig.serverUrl}/api/v1/series?page=0&size=20&sort=metadata.titleSort,asc&media_status=READY`,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
            cache: "no-store", // Désactiver le cache
          }
        ).catch((error) => {
          console.error("API Home - Erreur fetch popular:", error);
          throw error;
        }),
      ]);

      console.log("API Home - Status des réponses:", {
        ongoing: ongoingResponse.status,
        recentlyRead: recentlyReadResponse.status,
        popular: popularResponse.status,
      });

      // Vérifier les réponses et récupérer les données
      const [ongoing, recentlyRead, popular] = await Promise.all([
        ongoingResponse.json(),
        recentlyReadResponse.json(),
        popularResponse.json(),
      ]);

      console.log("API Home - Données récupérées:", {
        ongoingCount: ongoing.content?.length || 0,
        recentlyReadCount: recentlyRead.content?.length || 0,
        popularCount: popular.content?.length || 0,
      });

      // Retourner les données
      return NextResponse.json({
        ongoing: ongoing.content || [],
        recentlyRead: recentlyRead.content || [],
        popular: popular.content || [],
      });
    } catch (error) {
      console.error("API Home - Erreur lors de la récupération des données:", error);
      throw error;
    }
  } catch (error) {
    console.error("API Home - Erreur générale:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}
