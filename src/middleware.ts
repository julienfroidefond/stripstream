import { NextResponse, NextRequest } from "next/server";
import { getAuthSession } from "@/lib/middleware-auth";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register", "/images"];

// Routes d'API qui ne nécessitent pas d'authentification
const publicApiRoutes = ["/api/auth/register", "/api/komga/test"];

// Langues supportées
const locales = ["fr", "en"];
const defaultLocale = "fr";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Gestion de la langue
  let locale = request.headers.get("cookie")?.match(/NEXT_LOCALE=([^;]+)/)?.[1];

  // Si pas de cookie de langue ou langue non supportée, on utilise la langue par défaut
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;
  }

  // Vérifier si c'est une route publique avant de gérer l'authentification
  if (
    publicRoutes.includes(pathname) ||
    publicApiRoutes.includes(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/fonts/") ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Vérifier l'authentification avec NextAuth v5
  const session = await getAuthSession(request);
  
  console.log(`[Middleware] Path: ${pathname}, Has session: ${!!session}`);
  
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
            name: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Définir le cookie de langue si nécessaire
  const response = NextResponse.next();
  if (!request.headers.get("cookie")?.includes("NEXT_LOCALE") && locale) {
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 an
      secure: process.env.NODE_ENV === "production", // Secure uniquement en prod HTTPS
      sameSite: "lax", // Protection CSRF
    });
  }

  return response;
}

// Configuration des routes à protéger
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (NextAuth routes)
     * 2. /_next/* (Next.js internals)
     * 3. /fonts/* (inside public directory)
     * 4. /images/* (inside public directory)
     * 5. Static files (manifest.json, favicon.ico, etc.)
     */
    "/((?!api/auth|api/health|_next/static|_next/image|fonts|images|manifest.json|favicon|sitemap.xml|sw.js|offline.html).*)",
  ],
};