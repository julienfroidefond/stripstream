import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverCacheService } from "@/services/serverCacheService";

export async function GET(request: Request, { params }: { params: { seriesId: string } }) {
  const configCookie = cookies().get("komgaCredentials");

  if (!configCookie) {
    return NextResponse.json({ error: "Configuration Komga manquante" }, { status: 401 });
  }

  try {
    const config = JSON.parse(atob(configCookie.value));
    const cacheKey = `series-${params.seriesId}-read-progress`;
    const cachedData = await serverCacheService.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const readProgress = await fetchReadProgress(config, params.seriesId);
    await serverCacheService.set(cacheKey, readProgress, 300); // Cache for 5 minutes

    return NextResponse.json(readProgress);
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la progression" },
      { status: 500 }
    );
  }
}

async function fetchReadProgress(config: any, seriesId: string) {
  const { serverUrl, credentials } = config;
  const response = await fetch(`${serverUrl}/api/v1/series/${seriesId}/read-progress/tachiyomi`, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
