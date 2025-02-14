import { NextResponse } from "next/server";
import { AuthServerService } from "@/lib/services/auth-server.service";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    try {
      const userData = await AuthServerService.createUser(email, password);
      AuthServerService.setUserCookie(userData);

      return NextResponse.json({ message: "Inscription réussie", user: userData });
    } catch (error) {
      if (error instanceof Error && error.message === "EMAIL_EXISTS") {
        return NextResponse.json(
          {
            error: {
              code: "EMAIL_EXISTS",
              message: "Cet email est déjà utilisé",
            },
          },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Une erreur est survenue lors de l'inscription",
        },
      },
      { status: 500 }
    );
  }
}
