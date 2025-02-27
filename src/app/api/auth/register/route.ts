import { NextResponse } from "next/server";
import { AuthServerService, UserData } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import { getErrorMessage } from "@/utils/errors";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    try {
      const userData: UserData = await AuthServerService.createUser(email, password);
      AuthServerService.setUserCookie(userData);

      return NextResponse.json({
        message: "✅ Inscription réussie",
        user: userData,
      });
    } catch (error) {
      if (error instanceof AppError) {
        const status =
          error.code === ERROR_CODES.AUTH.EMAIL_EXISTS ||
          error.code === ERROR_CODES.AUTH.PASSWORD_NOT_STRONG
            ? 400
            : 500;
        return NextResponse.json(
          {
            error: AppError,
          },
          { status }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.AUTH.INVALID_USER_DATA,
          name: "Invalid user data",
          message: getErrorMessage(ERROR_CODES.AUTH.INVALID_USER_DATA),
        },
      },
      { status: 500 }
    );
  }
}
