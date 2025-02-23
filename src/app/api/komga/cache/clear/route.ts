import { NextResponse } from "next/server";
import { getServerCacheService } from "@/lib/services/server-cache.service";

export async function POST() {
  const cacheService = await getServerCacheService();
  cacheService.clear();
  return NextResponse.json({ message: "Cache cleared" });
}
