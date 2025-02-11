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

    // Appel à l'API Komga
    const response = await fetch(`${config.serverUrl}/api/v1/series/${params.seriesId}/thumbnail`, {
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

    // Récupérer le type MIME de l'image
    const contentType = response.headers.get("content-type");
    const imageBuffer = await response.arrayBuffer();

    // Retourner l'image avec le bon type MIME
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'image:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
