import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuthConfig } from "@/types/auth";
import { serverCacheService } from "@/lib/services/server-cache.service";

export async function GET() {
  try {
    // Vérifier l'authentification de l'utilisateur
    const userCookie = cookies().get("komgaUser");
    if (!userCookie) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    try {
      const userData = JSON.parse(atob(userCookie.value));
      if (!userData.authenticated) {
        throw new Error("User not authenticated");
      }
    } catch (error) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    // Récupérer les credentials Komga depuis le cookie
    const configCookie = cookies().get("komgaCredentials");
    if (!configCookie) {
      return NextResponse.json({ error: "Configuration Komga manquante" }, { status: 401 });
    }

    let config: AuthConfig;
    try {
      config = JSON.parse(atob(configCookie.value));
    } catch (error) {
      return NextResponse.json({ error: "Configuration Komga invalide" }, { status: 401 });
    }

    // Clé de cache unique pour les bibliothèques
    const cacheKey = "libraries";

    // Fonction pour récupérer les bibliothèques
    const fetchLibraries = async () => {
      const response = await fetch(`${config.serverUrl}/api/v1/libraries`, {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.credentials?.username}:${config.credentials?.password}`
          ).toString("base64")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des bibliothèques");
      }

      return response.json();
    };

    // Récupérer les données du cache ou faire l'appel API
    const data = await serverCacheService.getOrSet(cacheKey, fetchLibraries, 5 * 60); // Cache de 5 minutes

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur lors de la récupération des bibliothèques:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
