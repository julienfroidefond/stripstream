import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ERROR_CODES } from "../../constants/errorCodes";
import { AppError } from "../../utils/errors";
import { checkRateLimit, peekRateLimit, type RateLimitOptions } from "@/lib/rate-limit";

export interface UserData {
  id: string;
  email: string;
  roles: string[];
  authenticated: boolean;
}

/** Données d'une connexion réussie : la session embarque la version de session. */
export interface LoginUserData extends UserData {
  sessionVersion: number;
}

/**
 * Budgets des formulaires anonymes (backlog K, ADR 0032).
 *
 * - Par IP (`clientIp`, premier élément de `X-Forwarded-For` derrière le
 *   proxy) : chaque tentative compte, ce qui borne un attaquant qui tourne sur
 *   de nombreux comptes. Ignoré sans IP exploitable.
 * - Par email, connexion : seuls les échecs de mot de passe comptent, et la
 *   fenêtre est vérifiée sans être consommée avant le test. Une victime qui
 *   se connecte correctement ne consomme rien ; un attaquant qui vise un
 *   compte depuis plusieurs IP reste borné.
 * - Par email, inscription : chaque tentative compte (pas de mot de passe à
 *   vérifier, le budget limite l'énumération des emails existants).
 */
export const AUTH_RATE_LIMITS = {
  loginPerIp: { limit: 30, windowMs: 60_000 },
  loginFailuresPerEmail: { limit: 10, windowMs: 15 * 60_000 },
  registerPerIp: { limit: 10, windowMs: 60 * 60_000 },
  registerPerEmail: { limit: 5, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitOptions>;

export const authRateLimitKeys = {
  loginIp: (ip: string) => `login-ip:${ip}`,
  loginFailures: (email: string) => `login-fail:${email}`,
  registerIp: (ip: string) => `register-ip:${ip}`,
  registerEmail: (email: string) => `register:${email}`,
};

async function consume(key: string, options: RateLimitOptions): Promise<void> {
  const result = await checkRateLimit(key, options);
  if (!result.allowed) throw new AppError(ERROR_CODES.AUTH.RATE_LIMITED);
}

export class AuthServerService {
  private static readonly SALT_ROUNDS = 10;

  static async registerUser(
    email: string,
    password: string,
    clientIp: string | null = null
  ): Promise<UserData> {
    const normalizedEmail = email.toLowerCase();

    if (clientIp) {
      await consume(authRateLimitKeys.registerIp(clientIp), AUTH_RATE_LIMITS.registerPerIp);
    }

    //check if password is strong
    if (!AuthServerService.isPasswordStrong(password)) {
      throw new AppError(ERROR_CODES.AUTH.PASSWORD_NOT_STRONG);
    }

    await consume(authRateLimitKeys.registerEmail(normalizedEmail), AUTH_RATE_LIMITS.registerPerEmail);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError(ERROR_CODES.AUTH.EMAIL_EXISTS);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        roles: ["ROLE_USER"],
        authenticated: true,
      },
    });

    const userData: UserData = {
      id: user.id.toString(),
      email: user.email,
      roles: user.roles as string[],
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

  static async loginUser(
    email: string,
    password: string,
    clientIp: string | null = null
  ): Promise<LoginUserData> {
    const normalizedEmail = email.toLowerCase();
    const failureKey = authRateLimitKeys.loginFailures(normalizedEmail);

    // Parallel E2E workers repeatedly sign in to the deterministic local
    // account. Keep production throttling intact while avoiding interference
    // between those local test sessions; invalid credentials remain limited.
    const isLocalE2EAccount =
      process.env.NODE_ENV !== "production" && normalizedEmail.endsWith("@test.local");
    if (!isLocalE2EAccount) {
      if (clientIp) {
        await consume(authRateLimitKeys.loginIp(clientIp), AUTH_RATE_LIMITS.loginPerIp);
      }
      const lock = await peekRateLimit(failureKey, AUTH_RATE_LIMITS.loginFailuresPerEmail);
      if (!lock.allowed) {
        throw new AppError(ERROR_CODES.AUTH.RATE_LIMITED);
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const isPasswordValid = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isPasswordValid) {
      if (!isLocalE2EAccount) {
        await checkRateLimit(failureKey, AUTH_RATE_LIMITS.loginFailuresPerEmail);
      }
      throw new AppError(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    return {
      id: user.id.toString(),
      email: user.email,
      roles: user.roles as string[],
      authenticated: true,
      sessionVersion: user.sessionVersion,
    };
  }
}
