import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";

export interface UserData {
  id: string;
  email: string;
  roles: string[];
  authenticated: boolean;
}

export class AuthServerService {
  private static readonly SALT_ROUNDS = 10;

  static async registerUser(email: string, password: string): Promise<UserData> {
    //check if password is strong
    if (!AuthServerService.isPasswordStrong(password)) {
      throw new AppError(ERROR_CODES.AUTH.PASSWORD_NOT_STRONG);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(ERROR_CODES.AUTH.EMAIL_EXISTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        roles: ["ROLE_USER"],
        authenticated: true,
      },
    });

    const userData: UserData = {
      id: user.id,
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

  static async loginUser(email: string, password: string): Promise<UserData> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    const userData: UserData = {
      id: user.id,
      email: user.email,
      roles: user.roles,
      authenticated: true,
    };

    return userData;
  }
}
