import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      roles: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    roles: string[];
    /** Version de session du compte à la connexion (ADR 0032). */
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles: string; // Stocké comme string JSON
    /** Version de session émise ; comparée à `users.sessionVersion` (ADR 0032). */
    sessionVersion?: number;
  }
}
