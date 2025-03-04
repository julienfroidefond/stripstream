"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InstallPWA } from "../ui/InstallPWA";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { registerServiceWorker } from "@/lib/registerSW";
import { NetworkStatus } from "../ui/NetworkStatus";
import { LoadingBar } from "@/components/ui/loading-bar";
import { DebugWrapper } from "@/components/debug/DebugWrapper";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

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
      <PreferencesProvider>
        <div className="relative min-h-screen h-full">
          <LoadingBar />
          {!isPublicRoute && <Header onToggleSidebar={handleToggleSidebar} />}
          {!isPublicRoute && <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />}
          <main className={`${!isPublicRoute ? "container pt-safe" : ""}`}>{children}</main>
          <InstallPWA />
          <Toaster />
          <NetworkStatus />
          <DebugWrapper />
        </div>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
