import { NextResponse } from "next/server";
import { AuthServerService } from "@/lib/services/auth-server.service";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    try {
      const userData = await AuthServerService.loginUser(email, password);
      AuthServerService.setUserCookie(userData);

      return NextResponse.json({ message: "Connexion réussie", user: userData });
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_CREDENTIALS",
              message: "Email ou mot de passe incorrect",
            },
          },
          { status: 401 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Une erreur est survenue lors de la connexion",
        },
      },
      { status: 500 }
    );
  }
}
