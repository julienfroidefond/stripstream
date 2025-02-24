import { NextResponse } from "next/server";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    try {
      const userData = await AuthServerService.loginUser(email, password);
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
              message: ERROR_MESSAGES[error.code],
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
          message: ERROR_MESSAGES[ERROR_CODES.AUTH.INVALID_CREDENTIALS],
        },
      },
      { status: 500 }
    );
  }
}
