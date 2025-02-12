"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Détecter si c'est un appareil iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Vérifier si l'app est déjà installée
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstallable(false);
      }
    } catch (error) {
      console.error("Erreur lors de l'installation:", error);
    }

    setDeferredPrompt(null);
  };

  if (!isInstallable && !isIOS) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50">
      <div className="bg-card border shadow-lg rounded-lg p-4 max-w-sm mx-auto sm:mx-0">
        <div className="flex items-start gap-4">
          <Download className="h-6 w-6 flex-shrink-0 text-primary" />
          <div className="flex-1">
            <h3 className="font-medium mb-1">Installer StripStream</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {isIOS
                ? "Ajoutez StripStream à votre écran d'accueil pour une meilleure expérience"
                : "Installez StripStream pour un accès rapide et une meilleure expérience"}
            </p>
            {isIOS ? (
              <div className="text-sm text-muted-foreground">
                Appuyez sur <span className="font-medium">Partager</span> puis{" "}
                <span className="font-medium">Sur l'écran d'accueil</span>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              >
                Installer l'application
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
