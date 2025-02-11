import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { serverCacheService } from "@/lib/services/server-cache.service";

export async function GET(request: Request, { params }: { params: { bookId: string } }) {
  try {
    // Récupérer les credentials Komga depuis le cookie
    const cookieStore = cookies();
    const configCookie = cookieStore.get("komgaCredentials");
    console.log("API Books - Cookie komgaCredentials:", configCookie?.value);

    if (!configCookie) {
      console.log("API Books - Cookie komgaCredentials manquant");
      return NextResponse.json({ error: "Configuration Komga manquante" }, { status: 401 });
    }

    let komgaConfig;
    try {
      komgaConfig = JSON.parse(atob(configCookie.value));
      console.log("API Books - Config décodée:", {
        serverUrl: komgaConfig.serverUrl,
        hasCredentials: !!komgaConfig.credentials,
      });
    } catch (error) {
      console.error("API Books - Erreur de décodage du cookie:", error);
      return NextResponse.json({ error: "Configuration Komga invalide" }, { status: 401 });
    }

    if (!komgaConfig.credentials?.username || !komgaConfig.credentials?.password) {
      console.log("API Books - Credentials manquants dans la config");
      return NextResponse.json({ error: "Credentials Komga manquants" }, { status: 401 });
    }

    const auth = Buffer.from(
      `${komgaConfig.credentials.username}:${komgaConfig.credentials.password}`
    ).toString("base64");

    console.log("API Books - Appel à l'API Komga pour le livre:", params.bookId);

    // Clé de cache unique pour ce livre
    const cacheKey = `book-${params.bookId}`;

    // Fonction pour récupérer les données du livre
    const fetchBookData = async () => {
      // Récupération des détails du tome
      const bookResponse = await fetch(`${komgaConfig.serverUrl}/api/v1/books/${params.bookId}`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      if (!bookResponse.ok) {
        console.error("API Books - Erreur de l'API Komga (book):", {
          status: bookResponse.status,
          statusText: bookResponse.statusText,
        });
        throw new Error("Erreur lors de la récupération des détails du tome");
      }

      const book = await bookResponse.json();

      // Récupération des pages du tome
      const pagesResponse = await fetch(
        `${komgaConfig.serverUrl}/api/v1/books/${params.bookId}/pages`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!pagesResponse.ok) {
        console.error("API Books - Erreur de l'API Komga (pages):", {
          status: pagesResponse.status,
          statusText: pagesResponse.statusText,
        });
        throw new Error("Erreur lors de la récupération des pages du tome");
      }

      const pages = await pagesResponse.json();

      // Retourner les données combinées
      return {
        book,
        pages: pages.map((page: any) => page.number),
      };
    };

    // Récupérer les données du cache ou faire l'appel API
    const data = await serverCacheService.getOrSet(cacheKey, fetchBookData, 5 * 60); // Cache de 5 minutes

    return NextResponse.json(data);
  } catch (error) {
    console.error("API Books - Erreur:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur lors de la récupération des données",
      },
      { status: 500 }
    );
  }
}
