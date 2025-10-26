import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { AuthServerService } from "@/lib/services/auth-server.service";
import logger from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "checkbox" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const userData = await AuthServerService.loginUser(
            credentials.email as string,
            credentials.password as string
          );
          
          return {
            id: userData.id,
            email: userData.email,
            roles: userData.roles,
          };
        } catch (error) {
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        // Reconvertir la string en tableau
        session.user.roles = JSON.parse(token.roles as string);
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
  useSecureCookies: false,
});