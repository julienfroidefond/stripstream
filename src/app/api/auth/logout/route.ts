import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";

export async function POST() {
  try {
    // Supprimer le cookie
    cookies().delete("stripUser");
    return NextResponse.json({ message: "👋 Déconnexion réussie" });
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.AUTH.LOGOUT_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.AUTH.LOGOUT_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
