import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import { UserModel } from "@/lib/models/user.model";
import bcrypt from "bcrypt";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

interface UserData {
  id: string;
  email: string;
  roles: string[];
  authenticated: boolean;
}

export class AuthServerService {
  private static readonly SALT_ROUNDS = 10;

  static async createUser(email: string, password: string): Promise<UserData> {
    await connectDB();

    //check if password is strong
    if (!AuthServerService.isPasswordStrong(password)) {
      throw new AppError(ERROR_CODES.AUTH.PASSWORD_NOT_STRONG);
    }

    // Check if user already exists
    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError(ERROR_CODES.AUTH.EMAIL_EXISTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create new user
    const user = await UserModel.create({
      email: email.toLowerCase(),
      password: hashedPassword,
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

  static isPasswordStrong(password: string): boolean {
    //check if password is strong
    if (password.length < 8) {
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      return false;
    }
    if (!/[0-9]/.test(password)) {
      return false;
    }
    // if (!/[!@#$%^&*]/.test(password)) {
    //   return false;
    // }
    return true;
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
      throw new AppError(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
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
