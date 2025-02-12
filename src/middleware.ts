import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register", "/images"];

// Routes d'API qui ne nécessitent pas d'authentification
const publicApiRoutes = ["/api/auth/login", "/api/auth/register", "/api/komga/test"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérifier si c'est une route publique ou commence par /images/
  if (
    publicRoutes.includes(pathname) ||
    publicApiRoutes.includes(pathname) ||
    pathname.startsWith("/images/")
  ) {
    return NextResponse.next();
  }

  // Vérifier si c'est une route d'API
  if (pathname.startsWith("/api/")) {
    // Vérifier les credentials Komga
    const configCookie = request.cookies.get("komgaCredentials");

    if (!configCookie) {
      return NextResponse.json({ error: "Configuration Komga manquante" }, { status: 401 });
    }

    try {
      JSON.parse(atob(configCookie.value));
    } catch (error) {
      return NextResponse.json({ error: "Configuration Komga invalide" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // Pour les routes protégées, vérifier la présence de l'utilisateur
  const user = request.cookies.get("komgaUser");
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const userData = JSON.parse(atob(user.value));
    if (!userData.authenticated) {
      throw new Error("User not authenticated");
    }
  } catch (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configuration des routes à protéger
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (authentication routes)
     * 2. /_next/* (Next.js internals)
     * 3. /fonts/* (inside public directory)
     * 4. /images/* (inside public directory)
     * 5. /favicon.ico, /sitemap.xml (public files)
     */
    "/((?!api/auth|_next/static|_next/image|fonts|images|favicon.ico|sitemap.xml).*)",
  ],
};
