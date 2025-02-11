import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { serverUrl, username, password } = await request.json();

    // Vérification des paramètres requis
    if (!serverUrl || !username || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }

    // Test de connexion à Komga en utilisant la route /api/v1/libraries
    const response = await fetch(`${serverUrl}/api/v1/libraries`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
    });

    // Log de la réponse pour le debug
    console.log("Komga response status:", response.status);
    console.log("Komga response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = "Impossible de se connecter au serveur Komga";
      let errorDetails = null;

      try {
        errorDetails = await response.json();
      } catch (e) {
        // Si on ne peut pas parser la réponse, on utilise le texte brut
        try {
          errorDetails = await response.text();
        } catch (e) {
          // Si on ne peut pas récupérer le texte non plus, on garde le message par défaut
        }
      }

      // Personnalisation du message d'erreur en fonction du status
      if (response.status === 401) {
        errorMessage = "Identifiants Komga invalides";
      } else if (response.status === 404) {
        errorMessage = "Le serveur Komga n'est pas accessible à cette adresse";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: {
            status: response.status,
            statusText: response.statusText,
            errorDetails,
          },
        },
        { status: response.status }
      );
    }

    const libraries = await response.json();
    return NextResponse.json({ success: true, libraries });
  } catch (error) {
    console.error("Erreur lors du test de connexion:", error);
    return NextResponse.json(
      {
        error: "Le serveur Komga est inaccessible",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 }
    );
  }
}
