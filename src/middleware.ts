import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ERROR_CODES } from "./constants/errorCodes";
import type { UserData } from "./lib/services/auth-server.service";
import { getErrorMessage } from "./utils/errors";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register", "/images"];

// Routes d'API qui ne nécessitent pas d'authentification
const publicApiRoutes = ["/api/auth/login", "/api/auth/register", "/api/komga/test"];

// Langues supportées
const locales = ["fr", "en"];
const defaultLocale = "fr";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Gestion de la langue
  let locale = request.cookies.get("NEXT_LOCALE")?.value;

  // Si pas de cookie de langue ou langue non supportée, on utilise la langue par défaut
  if (!locale || !locales.includes(locale)) {
    locale = defaultLocale;

    // On crée une nouvelle réponse avec le cookie de langue
    const response = NextResponse.next();
    response.cookies.set("NEXT_LOCALE", locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 an
    });

    return response;
  }

  // Gestion de l'authentification
  const user = request.cookies.get("stripUser");

  // Si l'utilisateur est connecté et essaie d'accéder à la page de login ou register
  if (user?.value && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Vérifier si c'est une route publique ou commence par certains préfixes
  if (
    publicRoutes.includes(pathname) ||
    publicApiRoutes.includes(pathname) ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/fonts/")
  ) {
    return NextResponse.next();
  }

  // Pour toutes les routes protégées, vérifier la présence de l'utilisateur
  if (!user || !user.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.MIDDLEWARE.UNAUTHORIZED,
            message: getErrorMessage(ERROR_CODES.MIDDLEWARE.UNAUTHORIZED),
            name: "Unauthorized",
          },
        },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const userData: UserData = JSON.parse(atob(user.value));
    if (!userData || !userData.authenticated || !userData.id || !userData.email) {
      throw new Error(getErrorMessage(ERROR_CODES.MIDDLEWARE.INVALID_SESSION));
    }
  } catch (error) {
    console.error("Erreur de validation du cookie:", error);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: {
            code: ERROR_CODES.MIDDLEWARE.INVALID_TOKEN,
            message: getErrorMessage(ERROR_CODES.MIDDLEWARE.INVALID_TOKEN),
            name: "Invalid token",
          },
        },
        { status: 401 }
      );
    }
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
     * 5. Static files (manifest.json, favicon.ico, etc.)
     */
    "/((?!api/auth/*|_next/static|_next/image|fonts|images|manifest.json|favicon.ico|sitemap.xml|sw.js|offline.html).*)",
  ],
};
