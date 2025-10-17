"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InstallPWA } from "../ui/InstallPWA";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";
import { registerServiceWorker } from "@/lib/registerSW";
import { NetworkStatus } from "../ui/NetworkStatus";
import { DebugWrapper } from "@/components/debug/DebugWrapper";
import { DebugProvider } from "@/contexts/DebugContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import type { KomgaLibrary, KomgaSeries } from "@/types/komga";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register"];

interface ClientLayoutProps {
  children: React.ReactNode;
  initialLibraries: KomgaLibrary[];
  initialFavorites: KomgaSeries[];
  userIsAdmin?: boolean;
}

export default function ClientLayout({ children, initialLibraries = [], initialFavorites = [], userIsAdmin = false }: ClientLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { preferences } = usePreferences();

  const backgroundStyle = useMemo(() => {
    const bg = preferences.background;
    
    if (bg.type === "gradient" && bg.gradient) {
      return {
        backgroundImage: bg.gradient,
        backgroundAttachment: "fixed" as const,
      };
    }
    
    if (bg.type === "image" && bg.imageUrl) {
      return {
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: "cover" as const,
        backgroundPosition: "center" as const,
        backgroundAttachment: "fixed" as const,
      };
    }
    
    return {};
  }, [preferences.background]);

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

  useEffect(() => {
    // Enregistrer le service worker
    registerServiceWorker();
  }, []);

  // Ne pas afficher le header et la sidebar sur les routes publiques
  const isPublicRoute = publicRoutes.includes(pathname);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <DebugProvider>
        <div className="relative min-h-screen bg-background" style={backgroundStyle}>
          {!isPublicRoute && <Header onToggleSidebar={handleToggleSidebar} />}
          {!isPublicRoute && (
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={handleCloseSidebar} 
              initialLibraries={initialLibraries} 
              initialFavorites={initialFavorites}
              userIsAdmin={userIsAdmin}
            />
          )}
          <main className={`${!isPublicRoute ? "container pt-safe" : ""}`}>{children}</main>
          <InstallPWA />
          <Toaster />
          <NetworkStatus />
          <DebugWrapper />
        </div>
      </DebugProvider>
    </ThemeProvider>
  );
}
