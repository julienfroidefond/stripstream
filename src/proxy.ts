import { NextResponse, NextRequest } from "next/server";
import { getAuthSession } from "@/lib/middleware-auth";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register", "/images"];

// Routes d'API qui ne nécessitent pas d'authentification
const publicApiRoutes = ["/api/auth/register", "/api/komga/test"];

// Langues supportées
const locales = ["fr", "en"];
const defaultLocale = "fr";

// Cookies de session Auth.js (dev + prod sécurisé), fragments `.0`, `.1`… inclus
const SESSION_COOKIE_PREFIXES = ["next-auth.session-token", "__Secure-next-auth.session-token"];

// Supprime un cookie de session indéchiffrable (secret ou format JWT changé après
// une mise à jour) pour que l'application se rétablisse d'elle-même.
const clearStaleSessionCookies = (request: NextRequest, response: NextResponse): NextResponse => {
  for (const { name } of request.cookies.getAll()) {
    if (SESSION_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      response.cookies.delete(name);
    }
  }
  return response;
};

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestPath = `${pathname}${request.nextUrl.search}`;
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-request-pathname", pathname);
  forwardedHeaders.set("x-request-path", requestPath);
  const createNextResponse = () => NextResponse.next({ request: { headers: forwardedHeaders } });

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
    return createNextResponse();
  }

  // Vérifier l'authentification avec NextAuth v5
  const session = await getAuthSession(request);

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
    loginUrl.searchParams.set("from", requestPath);
    return clearStaleSessionCookies(request, NextResponse.redirect(loginUrl));
  }

  // Définir le cookie de langue si nécessaire
  const response = createNextResponse();
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
    "/((?!api/auth|api/health|_next/static|_next/image|fonts|images|manifest.json|favicon|sitemap.xml).*)",
  ],
};
