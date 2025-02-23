import { NextRequest, NextResponse } from "next/server";
import { DebugService } from "@/lib/services/debug.service";

export async function GET() {
  try {
    const logs = await DebugService.getRequestLogs();
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération des logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const timing = await request.json();
    await DebugService.logRequest(timing);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de l'enregistrement du log" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await DebugService.clearLogs();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression des logs" }, { status: 500 });
  }
}
