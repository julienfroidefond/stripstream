"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InstallPWA } from "../ui/InstallPWA";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";
import { NetworkStatus } from "../ui/NetworkStatus";
import { usePreferences } from "@/contexts/PreferencesContext";
import { ServiceWorkerProvider } from "@/contexts/ServiceWorkerContext";
import type { NormalizedLibrary, NormalizedSeries } from "@/lib/providers/types";
import type { KomgaConfigSummary } from "@/app/actions/config";
import type { StripstreamConfigSummary } from "@/app/actions/stripstream-config";
import { defaultPreferences } from "@/types/preferences";
import logger from "@/lib/logger";
import { getRandomBookFromLibraries } from "@/app/actions/library";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register"];

interface ClientLayoutProps {
  children: React.ReactNode;
  initialLibraries: NormalizedLibrary[];
  initialFavorites: NormalizedSeries[];
  userIsAdmin?: boolean;
  komgaConfigs?: KomgaConfigSummary[];
  stripstreamConfigs?: StripstreamConfigSummary[];
}

export default function ClientLayout({
  children,
  initialLibraries = [],
  initialFavorites = [],
  userIsAdmin = false,
  komgaConfigs = [],
  stripstreamConfigs = [],
}: ClientLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [randomBookId, setRandomBookId] = useState<string | null>(null);
  const pathname = usePathname();
  const { preferences } = usePreferences();
  const prevLibraryIdsRef = useRef<string>("");

  const backgroundType = preferences.background.type;
  const komgaLibraries = preferences.background.komgaLibraries;

  // Stabiliser libraryIds - ne change que si le contenu change vraiment
  const libraryIdsString = useMemo(() => {
    const newIds = komgaLibraries?.join(",") || "";
    if (newIds !== prevLibraryIdsRef.current) {
      prevLibraryIdsRef.current = newIds;
    }
    return prevLibraryIdsRef.current;
  }, [komgaLibraries]);

  // Récupérer un book aléatoire pour le background
  const fetchRandomBook = useCallback(async () => {
    if (backgroundType === "komga-random" && libraryIdsString) {
      try {
        const libraryIds = libraryIdsString.split(",").filter(Boolean);
        const result = await getRandomBookFromLibraries(libraryIds);

        if (result.success && result.bookId) {
          setRandomBookId(result.bookId);
        }
      } catch (error) {
        logger.error({ err: error }, "Erreur lors de la récupération d'un book aléatoire:");
      }
    }
  }, [backgroundType, libraryIdsString]);

  useEffect(() => {
    if (backgroundType === "komga-random" && libraryIdsString) {
      fetchRandomBook();
    }
  }, [backgroundType, libraryIdsString, fetchRandomBook]);

  const backgroundStyle = useMemo(() => {
    const bg = preferences.background;
    const blur = bg.blur || 0;

    if (bg.type === "gradient" && bg.gradient) {
      return {
        backgroundImage: bg.gradient,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
      };
    }

    if (bg.type === "image" && bg.imageUrl) {
      return {
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
        backgroundRepeat: "no-repeat" as const,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
      };
    }

    if (bg.type === "komga-random" && randomBookId) {
      return {
        backgroundImage: `url(/api/komga/images/books/${randomBookId}/thumbnail)`,
        backgroundSize: "cover" as const,
        backgroundPosition: "top center" as const,
        backgroundRepeat: "no-repeat" as const,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
      };
    }

    return {};
  }, [preferences.background, randomBookId]);

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Gestionnaire pour fermer la barre latérale lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar");
      const toggleButton = document.getElementById("sidebar-toggle");

      if (
        sidebar &&
        !sidebar.contains(event.target as Node) &&
        toggleButton &&
        !toggleButton.contains(event.target as Node)
      ) {
        handleCloseSidebar();
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen]);


  // Ne pas afficher le header et la sidebar sur les routes publiques et le reader
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith("/books/");

  const hasCustomBackground = Object.keys(backgroundStyle).length > 0;
  const contentOpacity =
    (preferences.background.opacity ?? defaultPreferences.background.opacity ?? 10) / 100;

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ServiceWorkerProvider>
        {/* Background fixe pour les images et gradients */}
        {hasCustomBackground && <div className="fixed inset-0 -z-10" style={backgroundStyle} />}
        {!hasCustomBackground && (
          <>
            <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,hsl(var(--background)/0.99)_0%,hsl(var(--background)/0.94)_42%,hsl(var(--background))_100%)]" />
            <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(70%_45%_at_12%_0%,hsl(var(--primary)/0.16),transparent_62%),radial-gradient(58%_38%_at_88%_8%,hsl(190_86%_56%/0.14),transparent_65%),radial-gradient(50%_34%_at_50%_100%,hsl(334_72%_62%/0.1),transparent_70%)]" />
            <div className="pointer-events-none fixed inset-0 -z-10 bg-[repeating-linear-gradient(0deg,hsl(var(--foreground)/0.02)_0_1px,transparent_1px_24px),repeating-linear-gradient(90deg,hsl(var(--foreground)/0.015)_0_1px,transparent_1px_30px)]" />
          </>
        )}
        <div
          className="relative min-h-screen"
          style={
            hasCustomBackground
              ? { backgroundColor: `rgba(var(--background-rgb, 255, 255, 255), ${contentOpacity})` }
              : undefined
          }
        >
          {!isPublicRoute && (
            <Header
              onToggleSidebar={handleToggleSidebar}
              onRefreshBackground={fetchRandomBook}
              showRefreshBackground={preferences.background.type === "komga-random"}
            />
          )}
          {!isPublicRoute && (
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={handleCloseSidebar}
              initialLibraries={initialLibraries}
              initialFavorites={initialFavorites}
              userIsAdmin={userIsAdmin}
              komgaConfigs={komgaConfigs}
              stripstreamConfigs={stripstreamConfigs}
            />
          )}
          {!isPublicRoute && isSidebarOpen && (
            <button
              type="button"
              aria-label="Fermer la navigation"
              className="fixed inset-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-20 bg-black/35 backdrop-blur-[1px] transition-opacity lg:hidden"
              onClick={handleCloseSidebar}
            />
          )}
          <main className={!isPublicRoute ? "pt-safe" : ""}>{children}</main>
          <InstallPWA />
          <Toaster />
          <NetworkStatus />
        </div>
      </ServiceWorkerProvider>
    </ThemeProvider>
  );
}
