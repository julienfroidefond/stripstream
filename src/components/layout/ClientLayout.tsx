"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InstallPWA } from "../ui/InstallPWA";
import { Toaster } from "@/components/ui/toaster";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        setIsSidebarOpen(false);
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

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="relative min-h-screen">
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <Sidebar isOpen={isSidebarOpen} />
        <main className="container pt-4 md:pt-8">{children}</main>
        <InstallPWA />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
