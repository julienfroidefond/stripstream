import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import ClientLayout from "@/components/layout/ClientLayout";
import { PreferencesService } from "@/lib/services/preferences.service";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { cookies, headers } from "next/headers";
import { defaultPreferences } from "@/types/preferences";
import type { UserPreferences } from "@/types/preferences";
import type { KomgaLibrary, KomgaSeries } from "@/types/komga";
import logger from "@/lib/logger";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

export const metadata: Metadata = {
  title: {
    template: "%s - StripStream",
    default: "StripStream",
  },
  description: "Votre bibliothèque numérique pour lire vos BD, mangas et comics préférés",
  manifest: "/manifest.json",
  keywords: ["comics", "manga", "bd", "reader", "komga", "stripstream"],
  authors: [{ name: "Julien Froidefond" }],
  // colorScheme: "dark light",
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: "/favicon.png",
        type: "image/png",
      },
      { url: "/images/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/images/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/images/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/images/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/images/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/images/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/images/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/images/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/images/icons/apple-icon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/images/icons/apple-icon-167x167.png",
        sizes: "167x167",
        type: "image/png",
      },
      {
        url: "/images/icons/apple-icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
    ],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "fr";
  const requestPath = requestHeaders.get("x-request-path") || "unknown";
  const requestPathname = requestHeaders.get("x-request-pathname") || "unknown";

  let preferences: UserPreferences = defaultPreferences;
  let userIsAdmin = false;
  let libraries: KomgaLibrary[] = [];
  let favorites: KomgaSeries[] = [];

  try {
    const currentUser = await import("@/lib/auth-utils").then((m) => m.getCurrentUser());

    if (currentUser) {
      const [preferencesData, librariesData, favoritesData] = await Promise.allSettled([
        PreferencesService.getPreferences(),
        import("@/lib/services/library.service").then((m) => m.LibraryService.getLibraries()),
        import("@/lib/services/favorites.service").then((m) =>
          m.FavoritesService.getFavorites({ requestPath, requestPathname })
        ),
      ]);

      userIsAdmin = currentUser.roles.includes("ROLE_ADMIN");

      if (preferencesData.status === "fulfilled") {
        preferences = preferencesData.value;
      }

      if (librariesData.status === "fulfilled") {
        libraries = librariesData.value || [];
      }

      if (favoritesData.status === "fulfilled") {
        favorites = favoritesData.value;
      }
    }
  } catch (error) {
    logger.error(
      { err: error, requestPath, requestPathname },
      "Erreur lors du chargement des données initiales:"
    );
  }

  return (
    <html lang={locale} suppressHydrationWarning className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-title" content="StripStream" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#4F46E5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0F172A" media="(prefers-color-scheme: dark)" />
        <meta name="msapplication-TileColor" content="#4F46E5" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2732x2048.png"
          media="(device-width: 1366px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1668x2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2388x1668.png"
          media="(device-width: 1194px) and (device-height: 834px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1536x2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2048x1536.png"
          media="(device-width: 1024px) and (device-height: 768px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2436x1125.png"
          media="(device-width: 812px) and (device-height: 375px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2688x1242.png"
          media="(device-width: 896px) and (device-height: 414px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1792x828.png"
          media="(device-width: 896px) and (device-height: 414px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1334x750.png"
          media="(device-width: 667px) and (device-height: 375px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1242x2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2208x1242.png"
          media="(device-width: 736px) and (device-height: 414px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2532x1170.png"
          media="(device-width: 844px) and (device-height: 390px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2778x1284.png"
          media="(device-width: 926px) and (device-height: 428px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2556x1179.png"
          media="(device-width: 852px) and (device-height: 393px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-2796x1290.png"
          media="(device-width: 932px) and (device-height: 430px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased h-full no-pinch-zoom",
          inter.className
        )}
      >
        <AuthProvider>
          <I18nProvider locale={locale}>
            <PreferencesProvider initialPreferences={preferences}>
              <ClientLayout
                initialLibraries={libraries}
                initialFavorites={favorites}
                userIsAdmin={userIsAdmin}
              >
                {children}
              </ClientLayout>
            </PreferencesProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
