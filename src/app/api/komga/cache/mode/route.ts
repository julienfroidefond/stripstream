import { NextResponse } from "next/server";
import { getServerCacheService } from "@/lib/services/server-cache.service";

export async function GET() {
  const cacheService = await getServerCacheService();
  return NextResponse.json({ mode: cacheService.getCacheMode() });
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

    const cacheService = await getServerCacheService();
    cacheService.setCacheMode(mode);
    return NextResponse.json({ mode: cacheService.getCacheMode() });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mode de cache:", error);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
