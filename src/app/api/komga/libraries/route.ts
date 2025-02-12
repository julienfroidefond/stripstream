import { NextResponse } from "next/server";
import { LibraryService } from "@/lib/services/library.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const libraries = await LibraryService.getLibraries();
    return NextResponse.json(libraries);
  } catch (error) {
    console.error("API Libraries - Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
