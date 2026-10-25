import type { Metadata } from "next";
import { Geist, Bricolage_Grotesque } from "next/font/google";
import "@/styles/globals.css";
import { cn } from "@/lib/utils";
import ClientLayout from "@/components/layout/ClientLayout";
import { PreferencesService } from "@/lib/services/preferences.service";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { AnonymousProvider } from "@/contexts/AnonymousContext";
import { UserScopeProvider } from "@/contexts/UserScopeContext";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { cookies } from "next/headers";
import { defaultPreferences } from "@/types/preferences";
import type { UserPreferences } from "@/types/preferences";
import { SidebarFavorites } from "@/components/layout/SidebarFavorites";
import { SidebarLibraries } from "@/components/layout/SidebarLibraries";
import { SidebarConnections } from "@/components/layout/SidebarConnections";
import { SidebarSectionSkeleton } from "@/components/layout/SidebarSectionSkeleton";
import { SPLASH_SCREENS } from "@/constants/splashScreens";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
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
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
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
      { url: "/images/icons/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/images/icons/apple-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/images/icons/apple-icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
};

/**
 * RootLayout : ne bloque QUE sur l'authentification (rapide) et la locale.
 * Les données de la sidebar (bibliothèques, favoris, connexions) sont
 * streamées via des composants serveur enveloppés dans <Suspense>, de
 * sorte que le `children` (home streamée par sections) s'affiche
 * immédiatement, même quand on change de connexion active.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "fr";

  // Uniquement l'utilisateur (auth DB, rapide) — PAS les données de la connexion.
  const [currentUser, loadedPreferences] = await Promise.all([
    import("@/lib/auth-utils")
      .then((m) => m.getCurrentUser())
      .catch(() => null),
    PreferencesService.getPreferences().catch(() => null),
  ]);
  const userIsAdmin = currentUser?.roles.includes("ROLE_ADMIN") ?? false;

  // Préférences : nécessaires au contexte client (fond, iso), lecture DB locale.
  let preferences: UserPreferences = defaultPreferences;
  if (currentUser) {
    preferences = loadedPreferences ?? defaultPreferences;
  }

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full", geist.variable, bricolage.variable)}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-title" content="StripStream" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#F7F6F2" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#100F0E" media="(prefers-color-scheme: dark)" />
        <meta name="msapplication-TileColor" content="#0E7C86" />
        <meta name="msapplication-tap-highlight" content="no" />
        {SPLASH_SCREENS.map((screen) => (
          <link
            key={screen.href}
            rel="apple-touch-startup-image"
            href={screen.href}
            media={screen.media}
          />
        ))}
      </head>
      <body
        className={cn(
          "min-h-dvh bg-background font-sans antialiased no-pinch-zoom"
        )}
      >
        <AuthProvider>
          <UserScopeProvider scope={currentUser?.id ?? null}>
            <I18nProvider locale={locale}>
              <PreferencesProvider initialPreferences={preferences}>
                <AnonymousProvider>
                  <ClientLayout
                    userIsAdmin={userIsAdmin}
                    sidebarFavorites={<SidebarFavorites />}
                    sidebarLibraries={<SidebarLibraries />}
                    sidebarConnections={<SidebarConnections />}
                    sidebarFavoritesSkeleton={<SidebarSectionSkeleton />}
                    sidebarLibrariesSkeleton={<SidebarSectionSkeleton />}
                    sidebarConnectionsSkeleton={<SidebarSectionSkeleton />}
                  >
                    {children}
                  </ClientLayout>
                </AnonymousProvider>
              </PreferencesProvider>
            </I18nProvider>
          </UserScopeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
