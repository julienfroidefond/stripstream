import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user.model";

export async function POST(request: Request) {
  try {
    const { email, password, remember } = await request.json();
    await connectDB();

    const user = await UserModel.findOne({ email: email.toLowerCase() });

    if (!user || user.password !== password) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Email ou mot de passe incorrect",
          },
        },
        { status: 401 }
      );
    }

    const userData = {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      authenticated: true,
    };

    // Encoder les données utilisateur en base64
    const encodedUserData = Buffer.from(JSON.stringify(userData)).toString("base64");

    // Définir le cookie avec les données utilisateur
    cookies().set("stripUser", encodedUserData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // 30 jours si "remember me" est coché, sinon 24 heures
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
    });

    return NextResponse.json({ message: "Connexion réussie", user: userData });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Une erreur est survenue lors de la connexion",
        },
      },
      { status: 500 }
    );
  }
}
