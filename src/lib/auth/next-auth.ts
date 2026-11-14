import NextAuth, { CredentialsSignin } from "next-auth";
import { ERROR_CODES } from "@/constants/errorCodes";
import { SIGN_IN_CODES } from "@/lib/auth/sign-in-codes";
import { AppError } from "@/utils/errors";
import Credentials from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { clientIpFromHeaders } from "@/lib/rate-limit/client-ip";
import { revalidateSessionToken, rolesFromToken } from "@/lib/auth/session-token";
import logger from "@/lib/logger";

/**
 * Un blocage par rate-limit refuse aussi le bon mot de passe : le dire au lieu
 * de répondre « identifiants invalides », sinon l'utilisateur (ou l'admin)
 * bloqué ne comprend pas pourquoi son mot de passe correct échoue.
 */
class RateLimitedSignin extends CredentialsSignin {
  code = SIGN_IN_CODES.rateLimited;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const userData = await AuthServerService.loginUser(
            credentials.email as string,
            credentials.password as string,
            clientIpFromHeaders(request?.headers)
          );

          return {
            id: userData.id,
            email: userData.email,
            roles: userData.roles,
            sessionVersion: userData.sessionVersion,
          };
        } catch (error) {
          if (error instanceof AppError && error.code === ERROR_CODES.AUTH.RATE_LIMITED) {
            logger.warn("Sign-in throttled");
            throw new RateLimitedSignin();
          }
          logger.error({ err: error }, "Auth error");
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Convertir le tableau en string pour éviter les problèmes de clonage
        token.roles = JSON.stringify(user.roles);
        token.sessionVersion = user.sessionVersion ?? 0;
        return token;
      }
      // Les rôles et l'existence du compte sont relus à chaque lecture de
      // session : un compte supprimé, rétrogradé ou dont le mot de passe a
      // changé ne garde pas ses droits jusqu'à l'expiration du JWT (ADR 0032).
      return revalidateSessionToken(token, (id) =>
        prisma.user.findUnique({
          where: { id },
          select: { roles: true, sessionVersion: true },
        })
      );
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.roles = rolesFromToken(token);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  useSecureCookies: process.env.NODE_ENV === "production",
  logger: {
    error(error) {
      logger.error({ err: error }, "NextAuth error");
    },
    warn(code) {
      logger.warn({ code }, "NextAuth warning");
    },
  },
});
