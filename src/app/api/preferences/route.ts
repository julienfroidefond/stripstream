import { NextRequest, NextResponse } from "next/server";
import { PreferencesService } from "@/lib/services/preferences.service";

export async function GET() {
  try {
    const preferences = await PreferencesService.getPreferences();
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences:", error);
    return new NextResponse("Erreur lors de la récupération des préférences", { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const preferences = await request.json();
    const updatedPreferences = await PreferencesService.updatePreferences(preferences);
    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    return new NextResponse("Erreur lors de la mise à jour des préférences", { status: 500 });
  }
}
