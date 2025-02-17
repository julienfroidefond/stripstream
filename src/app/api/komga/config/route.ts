import { NextResponse } from "next/server";
import { ConfigDBService } from "@/lib/services/config-db.service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const mongoConfig = await ConfigDBService.saveConfig(data);
    // Convertir le document Mongoose en objet simple
    const config = {
      url: mongoConfig.url,
      username: mongoConfig.username,
      password: mongoConfig.password,
      userId: mongoConfig.userId,
    };
    return NextResponse.json(
      { message: "Configuration sauvegardée avec succès", config },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la configuration:", error);
    if (error instanceof Error && error.message === "Utilisateur non authentifié") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde de la configuration" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const mongoConfig = await ConfigDBService.getConfig();
    // Convertir le document Mongoose en objet simple
    const config = {
      url: mongoConfig.url,
      username: mongoConfig.username,
      password: mongoConfig.password,
      userId: mongoConfig.userId,
    };
    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération de la configuration:", error);
    if (error instanceof Error) {
      if (error.message === "Utilisateur non authentifié") {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
      }
      if (error.message === "Configuration non trouvée") {
        return NextResponse.json({ error: "Configuration non trouvée" }, { status: 404 });
      }
    }
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la configuration" },
      { status: 500 }
    );
  }
}
