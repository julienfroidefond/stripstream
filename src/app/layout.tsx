import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import ClientLayout from "@/components/layout/ClientLayout";
import { PreferencesService } from "@/lib/services/preferences.service";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { I18nProvider } from "@/components/providers/I18nProvider";
import "@/i18n/i18n"; // Import i18next configuration
import { cookies } from "next/headers";
import { defaultPreferences } from "@/types/preferences";
import type { UserPreferences } from "@/types/preferences";
import type { KomgaLibrary, KomgaSeries } from "@/types/komga";
import { FavoriteService } from "@/lib/services/favorite.service";
import { LibraryService } from "@/lib/services/library.service";
import { SeriesService } from "@/lib/services/series.service";

const inter = Inter({ subsets: ["latin"] });

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
        url: "/favicon.svg",
        type: "image/svg+xml",
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
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "fr";

  // Récupération des données pour la sidebar côté serveur
  let libraries: KomgaLibrary[] = [];
  let favorites: KomgaSeries[] = [];
  let preferences: UserPreferences = defaultPreferences;

  try {
    // Tentative de chargement des données. Si l'utilisateur n'est pas authentifié,
    // les services lanceront une erreur mais l'application continuera de fonctionner
    const [librariesData, favoritesData, preferencesData] = await Promise.allSettled([
      LibraryService.getLibraries(),
      FavoriteService.getAllFavoriteIds(),
      PreferencesService.getPreferences(),
    ]);

    if (librariesData.status === "fulfilled") {
      libraries = librariesData.value;
    }

    if (favoritesData.status === "fulfilled") {
      favorites = await SeriesService.getMultipleSeries(favoritesData.value);
    }

    if (preferencesData.status === "fulfilled") {
      preferences = preferencesData.value;
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données de la sidebar:", error);
  }

  return (
    <html lang={locale} suppressHydrationWarning className="h-full">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover"
        />
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
          href="/images/splash/splash-1668x2388.png"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1536x2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/images/splash/splash-1242x2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
      </head>
      <body
        className={cn("min-h-screen bg-background font-sans antialiased h-full", inter.className)}
      >
        <I18nProvider locale={locale}>
          <PreferencesProvider initialPreferences={preferences}>
            <ClientLayout initialLibraries={libraries} initialFavorites={favorites}>
              {children}
            </ClientLayout>
          </PreferencesProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
