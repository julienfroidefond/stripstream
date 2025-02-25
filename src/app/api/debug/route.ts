import { NextRequest, NextResponse } from "next/server";
import { DebugService } from "@/lib/services/debug.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { ERROR_MESSAGES } from "@/constants/errorMessages";
import { AppError } from "@/utils/errors";

export async function GET() {
  try {
    const logs = await DebugService.getRequestLogs();
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: ERROR_MESSAGES[error.code],
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.DEBUG.FETCH_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.DEBUG.FETCH_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const timing = await request.json();
    await DebugService.logRequest(timing);
    return NextResponse.json({
      message: "✅ Log enregistré avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de l'enregistrement du log:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: ERROR_MESSAGES[error.code],
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.DEBUG.SAVE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.DEBUG.SAVE_ERROR],
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await DebugService.clearLogs();
    return NextResponse.json({
      message: "🧹 Logs supprimés avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des logs:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: ERROR_MESSAGES[error.code],
          },
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.DEBUG.CLEAR_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.DEBUG.CLEAR_ERROR],
        },
      },
      { status: 500 }
    );
  }
}
