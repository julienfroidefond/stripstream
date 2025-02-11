import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request, { params }: { params: { seriesId: string } }) {
  try {
    // Récupérer les credentials Komga depuis le cookie
    const configCookie = cookies().get("komga_credentials");
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

    const auth = Buffer.from(
      `${config.credentials.username}:${config.credentials.password}`
    ).toString("base64");

    // Appel à l'API Komga pour récupérer les détails de la série
    const [seriesResponse, booksResponse] = await Promise.all([
      // Détails de la série
      fetch(`${config.serverUrl}/api/v1/series/${params.seriesId}`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }),
      // Liste des tomes (on récupère tous les tomes avec size=1000)
      fetch(
        `${config.serverUrl}/api/v1/series/${params.seriesId}/books?page=0&size=1000&unpaged=true&sort=metadata.numberSort,asc`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      ),
    ]);

    if (!seriesResponse.ok || !booksResponse.ok) {
      const errorResponse = !seriesResponse.ok ? seriesResponse : booksResponse;
      const errorData = await errorResponse.json().catch(() => null);
      return NextResponse.json(
        {
          error: "Erreur lors de la récupération des données de la série",
          details: errorData,
        },
        { status: errorResponse.status }
      );
    }

    const [series, booksData] = await Promise.all([seriesResponse.json(), booksResponse.json()]);

    // On extrait la liste des tomes de la réponse paginée
    const books = booksData.content;

    return NextResponse.json({ series, books });
  } catch (error) {
    console.error("Erreur lors de la récupération de la série:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
