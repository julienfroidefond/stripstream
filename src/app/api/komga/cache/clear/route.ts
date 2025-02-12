import { NextResponse } from "next/server";
import { serverCacheService } from "@/lib/services/server-cache.service";

export async function POST() {
  try {
    serverCacheService.clear();
    return NextResponse.json({ message: "Cache serveur supprimé avec succès" });
  } catch (error) {
    console.error("Erreur lors de la suppression du cache serveur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du cache serveur" },
      { status: 500 }
    );
  }
}
