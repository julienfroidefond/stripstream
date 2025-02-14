import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user.model";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    await connectDB();

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        {
          error: {
            code: "EMAIL_EXISTS",
            message: "Cet email est déjà utilisé",
          },
        },
        { status: 400 }
      );
    }

    // Créer le nouvel utilisateur
    const user = await UserModel.create({
      email: email.toLowerCase(),
      password,
      roles: ["ROLE_USER"],
      authenticated: true,
    });

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
      // 24 heures par défaut pour les nouveaux utilisateurs
      maxAge: 24 * 60 * 60,
    });

    return NextResponse.json({ message: "Inscription réussie", user: userData });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Une erreur est survenue lors de l'inscription",
        },
      },
      { status: 500 }
    );
  }
}
