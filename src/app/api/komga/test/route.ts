import { NextResponse } from "next/server";
import { TestService } from "@/lib/services/test.service";
import { AuthConfig } from "@/types/auth";

export async function POST(request: Request) {
  try {
    const { serverUrl, username, password } = await request.json();

    const config: AuthConfig = {
      serverUrl,
      credentials: { username, password },
    };

    const result = await TestService.testConnection(config);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erreur lors du test de connexion:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 400 }
    );
  }
}
