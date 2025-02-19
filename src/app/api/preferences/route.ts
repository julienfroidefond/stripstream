import { NextRequest, NextResponse } from "next/server";
import { PreferencesService } from "@/lib/services/preferences.service";

export async function GET() {
  try {
    const user = await PreferencesService.getCurrentUser();
    const preferences = await PreferencesService.getPreferences(user.id);
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Erreur lors de la récupération des préférences:", error);
    return new NextResponse("Erreur lors de la récupération des préférences", { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const preferences = await request.json();
    const user = await PreferencesService.getCurrentUser();
    const updatedPreferences = await PreferencesService.updatePreferences(user.id, preferences);
    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des préférences:", error);
    return new NextResponse("Erreur lors de la mise à jour des préférences", { status: 500 });
  }
}
