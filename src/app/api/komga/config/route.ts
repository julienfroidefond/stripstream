import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Configuration Komga reçue:", data);

    return NextResponse.json({ message: "Configuration reçue avec succès" }, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la réception de la configuration:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réception de la configuration" },
      { status: 400 }
    );
  }
}
