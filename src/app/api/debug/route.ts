import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import type { RequestTiming } from "@/lib/services/debug.service";
import { DebugService } from "@/lib/services/debug.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { AppError } from "@/utils/errors";

export async function GET() {
  try {
    const logs: RequestTiming[] = await DebugService.getRequestLogs();
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            name: "Debug fetch error",
            message: getErrorMessage(error.code),
          } as AppError,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.DEBUG.FETCH_ERROR,
          name: "Debug fetch error",
          message: getErrorMessage(ERROR_CODES.DEBUG.FETCH_ERROR),
        } as AppError,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const timing: RequestTiming = await request.json();
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
            name: "Debug save error",
            message: getErrorMessage(error.code),
          } as AppError,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.DEBUG.SAVE_ERROR,
          name: "Debug save error",
          message: getErrorMessage(ERROR_CODES.DEBUG.SAVE_ERROR),
        } as AppError,
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
            name: "Debug clear error",
            message: getErrorMessage(error.code),
          } as AppError,
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.DEBUG.CLEAR_ERROR,
          name: "Debug clear error",
          message: getErrorMessage(ERROR_CODES.DEBUG.CLEAR_ERROR),
        } as AppError,
      },
      { status: 500 }
    );
  }
}
