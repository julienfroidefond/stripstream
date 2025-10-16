import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function getAuthSession(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    console.log(`[getAuthSession] Token exists: ${!!token}, Secret configured: ${!!process.env.NEXTAUTH_SECRET}`);
    
    if (!token) {
      return null;
    }

    return {
      user: {
        id: token.sub!,
        email: token.email!,
        roles: JSON.parse(token.roles as string),
      }
    };
  } catch (error) {
    console.error("Auth error in middleware:", error);
    return null;
  }
}
