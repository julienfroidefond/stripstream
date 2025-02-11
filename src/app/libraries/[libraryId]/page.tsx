import { cookies } from "next/headers";
import { SeriesGrid } from "@/components/library/SeriesGrid";
import { KomgaSeries } from "@/types/komga";

async function getLibrarySeries(libraryId: string) {
  const configCookie = cookies().get("komgaCredentials");

  if (!configCookie) {
    throw new Error("Configuration Komga manquante");
  }

  try {
    const config = JSON.parse(atob(configCookie.value));

    if (!config.serverUrl || !config.credentials?.username || !config.credentials?.password) {
      throw new Error("Configuration Komga invalide ou incomplète");
    }

    console.log("Config:", {
      serverUrl: config.serverUrl,
      hasCredentials: !!config.credentials,
      username: config.credentials.username,
    });

    const url = `${config.serverUrl}/api/v1/series?library_id=${libraryId}&page=0&size=100`;
    console.log("URL de l'API:", url);

    const credentials = `${config.credentials.username}:${config.credentials.password}`;
    const auth = Buffer.from(credentials).toString("base64");

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      cache: "no-store", // Désactiver le cache pour le debug
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Réponse de l'API non valide:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Données reçues:", {
      totalElements: data.totalElements,
      totalPages: data.totalPages,
      numberOfElements: data.numberOfElements,
    });

    return { data, serverUrl: config.serverUrl };
  } catch (error) {
    console.error("Erreur détaillée:", {
      message: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    throw error instanceof Error ? error : new Error("Erreur lors de la récupération des séries");
  }
}

export default async function LibraryPage({ params }: { params: { libraryId: string } }) {
  try {
    const { data: series, serverUrl } = await getLibrarySeries(params.libraryId);

    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Séries</h1>
        <SeriesGrid series={series.content || []} serverUrl={serverUrl} />
      </div>
    );
  } catch (error) {
    return (
      <div className="container py-8 space-y-8">
        <h1 className="text-3xl font-bold">Séries</h1>
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Erreur lors de la récupération des séries"}
          </p>
        </div>
      </div>
    );
  }
}
