import { NextRequest, NextResponse } from "next/server";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.AUTH.INVALID_USER_DATA,
            name: "Invalid user data",
            message: ERROR_MESSAGES[ERROR_CODES.AUTH.INVALID_USER_DATA],
          } as AppError,
        },
        { status: 400 }
      );
    }

    const userData = await AuthServerService.registerUser(email, password);

    return NextResponse.json({ success: true, user: userData });
  } catch (error) {
    logger.error({ err: error }, "Registration error:");

    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: error.name,
            message: error.message,
          } as AppError,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.AUTH.REGISTRATION_FAILED,
          name: "Registration failed",
          message: ERROR_MESSAGES[ERROR_CODES.AUTH.REGISTRATION_FAILED],
        } as AppError,
      },
      { status: 500 }
    );
  }
}
