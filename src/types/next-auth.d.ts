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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles: string; // Stocké comme string JSON
  }
}