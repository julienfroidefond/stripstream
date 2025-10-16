import { auth } from "@/lib/auth";
import type { UserData } from "@/lib/services/auth-server.service";

export async function getCurrentUser(): Promise<UserData | null> {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    roles: session.user.roles,
    authenticated: true,
  };
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.roles.includes("ROLE_ADMIN") ?? false;
}

export async function requireAdmin(): Promise<UserData> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthenticated");
  }
  
  if (!user.roles.includes("ROLE_ADMIN")) {
    throw new Error("Forbidden: Admin access required");
  }
  
  return user;
}
