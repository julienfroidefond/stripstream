import { NextResponse } from "next/server";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { UserData } from "@/lib/services/auth-server.service";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    try {
      const userData: UserData = await AuthServerService.loginUser(email, password);
      AuthServerService.setUserCookie(userData);

      return NextResponse.json({
        message: "✅ Connexion réussie",
        user: userData,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          {
            error: {
              code: error.code,
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
          code: ERROR_CODES.AUTH.INVALID_CREDENTIALS,
        },
      },
      { status: 500 }
    );
  }
}
