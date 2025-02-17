"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InstallPWA } from "../ui/InstallPWA";
import { Toaster } from "@/components/ui/toaster";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/lib/services/auth.service";
import { PreferencesProvider } from "@/contexts/PreferencesContext";

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ["/login", "/register"];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker enregistré avec succès:", registration);
        })
        .catch((error) => {
          console.error("Erreur lors de l'enregistrement du Service Worker:", error);
        });
    }
  }, []);

  // Ne pas afficher le header et la sidebar sur les routes publiques
  const isPublicRoute = publicRoutes.includes(pathname);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PreferencesProvider>
        <div className="relative min-h-screen">
          {!isPublicRoute && <Header onToggleSidebar={handleToggleSidebar} />}
          {!isPublicRoute && <Sidebar isOpen={isSidebarOpen} onClose={handleCloseSidebar} />}
          <main className={`${!isPublicRoute ? "container pt-4 md:pt-8" : ""}`}>{children}</main>
          <InstallPWA />
          <Toaster />
        </div>
      </PreferencesProvider>
    </ThemeProvider>
  );
}
