import { NextResponse } from "next/server";
import { serverCacheService } from "@/lib/services/server-cache.service";

export async function GET() {
  return NextResponse.json({ mode: serverCacheService.getCacheMode() });
}

export async function POST(request: Request) {
  try {
    const { mode } = await request.json();
    if (mode !== "file" && mode !== "memory") {
      return NextResponse.json(
        { error: "Invalid mode. Must be 'file' or 'memory'" },
        { status: 400 }
      );
    }

    serverCacheService.setCacheMode(mode);
    return NextResponse.json({ mode: serverCacheService.getCacheMode() });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mode de cache:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
