import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import logger from "@/lib/logger";

export async function getAuthSession(request: NextRequest) {
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return null;
    }

    return {
      user: {
        id: token.sub!,
        email: token.email!,
        roles: JSON.parse(token.roles as string),
      },
    };
  } catch (error) {
    logger.error({ err: error }, "Auth error in middleware");
    return null;
  }
}
