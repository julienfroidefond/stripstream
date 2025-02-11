import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
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

    // Reconstruire le chemin de l'image
    const imagePath = params.path.join("/");
    const imageUrl = `${config.serverUrl}/api/v1/${imagePath}`;

    // Appel à l'API Komga
    const response = await fetch(imageUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.credentials?.username}:${config.credentials?.password}`
        ).toString("base64")}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la récupération de l'image" },
        { status: response.status }
      );
    }

    // Récupérer les headers de l'image
    const contentType = response.headers.get("content-type");
    const buffer = await response.arrayBuffer();

    // Retourner l'image avec les bons headers
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'image:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
