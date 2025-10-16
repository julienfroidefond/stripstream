import { NextResponse } from "next/server";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
import type { UserData } from "@/lib/services/auth-server.service";
import { getErrorMessage } from "@/utils/errors";
import type { NextRequest } from "next/server";
export async function POST(request: NextRequest) {
  try {
    const { email, password, remember } = await request.json();

    try {
      const userData: UserData = await AuthServerService.loginUser(email, password);
      await AuthServerService.setUserCookie(userData, remember);

      return NextResponse.json({
        message: "✅ Connexion réussie",
        user: userData,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          {
            error,
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
          name: "Invalid credentials",
          message: getErrorMessage(ERROR_CODES.AUTH.INVALID_CREDENTIALS),
        } as AppError,
      },
      { status: 500 }
    );
  }
}
