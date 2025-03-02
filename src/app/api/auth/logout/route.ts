import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import type { AppErrorType } from "@/types/global";

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
          name: "Logout error",
          message: getErrorMessage(ERROR_CODES.AUTH.LOGOUT_ERROR),
        } as AppErrorType,
      },
      { status: 500 }
    );
  }
}
