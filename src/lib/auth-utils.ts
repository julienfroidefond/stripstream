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
