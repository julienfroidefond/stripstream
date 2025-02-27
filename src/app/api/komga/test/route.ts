import { NextResponse } from "next/server";
import { TestService } from "@/lib/services/test.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { getErrorMessage } from "@/utils/errors";
import { KomgaLibrary } from "@/types/komga";

export async function POST(request: Request) {
  try {
    const { serverUrl, username, password } = await request.json();
    const authHeader = Buffer.from(`${username}:${password}`).toString("base64");

    const { libraries }: { libraries: KomgaLibrary[] } = await TestService.testConnection({
      serverUrl,
      authHeader,
    });

    return NextResponse.json({
      message: `✅ Connexion réussie ! ${libraries.length} bibliothèque${
        libraries.length > 1 ? "s" : ""
      } trouvée${libraries.length > 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("Erreur lors du test de connexion:", error);
    return NextResponse.json(
      {
        error: {
          code: ERROR_CODES.KOMGA.CONNECTION_ERROR,
          name: "Connection error",
          message: getErrorMessage(ERROR_CODES.KOMGA.CONNECTION_ERROR),
        },
      },
      { status: 400 }
    );
  }
}
