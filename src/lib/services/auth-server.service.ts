import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user.model";

interface UserData {
  id: string;
  email: string;
  roles: string[];
  authenticated: boolean;
}

export class AuthServerService {
  static async createUser(email: string, password: string): Promise<UserData> {
    await connectDB();

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error("EMAIL_EXISTS");
    }

    // Create new user
    const user = await UserModel.create({
      email: email.toLowerCase(),
      password,
      roles: ["ROLE_USER"],
      authenticated: true,
    });

    const userData: UserData = {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      authenticated: true,
    };

    return userData;
  }

  static setUserCookie(userData: UserData): void {
    // Encode user data in base64
    const encodedUserData = Buffer.from(JSON.stringify(userData)).toString("base64");

    // Set cookie with user data
    cookies().set("stripUser", encodedUserData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours by default for new users
    });
  }

  static getCurrentUser(): UserData | null {
    const userCookie = cookies().get("stripUser");

    if (!userCookie) {
      return null;
    }

    try {
      return JSON.parse(atob(userCookie.value));
    } catch (error) {
      console.error("Error while getting user from cookie:", error);
      return null;
    }
  }

  static async loginUser(email: string, password: string): Promise<UserData> {
    await connectDB();

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (user.password !== password) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const userData: UserData = {
      id: user._id.toString(),
      email: user.email,
      roles: user.roles,
      authenticated: true,
    };

    return userData;
  }
}
