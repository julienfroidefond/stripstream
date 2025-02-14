import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  // Supprimer le cookie
  cookies().delete("stripUser");

  return NextResponse.json({ message: "Déconnexion réussie" });
}
