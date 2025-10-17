"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 jours en millisecondes

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(true); // Par défaut true pour éviter le flash

  useEffect(() => {
    // Vérifier si on est en mode standalone (PWA)
    const checkStandalone = () => {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://")
      );
    };

    // Vérifier si l'invite a été fermée récemment
    const checkDismissed = () => {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const dismissedTime = parseInt(dismissedAt, 10);
        const now = Date.now();
        if (now - dismissedTime < DISMISS_DURATION) {
          return true;
        }
      }
      return false;
    };

    // Détecter si c'est un appareil iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Initialiser les états
    setIsStandalone(checkStandalone());
    setIsDismissed(checkDismissed());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!checkDismissed() && !checkStandalone()) {
        setIsInstallable(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Écouter les changements de mode d'affichage
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    displayModeQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      displayModeQuery.removeEventListener("change", handleDisplayModeChange);
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

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  // Ne pas afficher si :
  // - L'app n'est pas installable ET ce n'est pas iOS
  // - OU si l'invite a été fermée
  // - OU si on est en mode standalone (PWA)
  if ((!isInstallable && !isIOS) || isDismissed || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50">
      <div className="bg-card/80 backdrop-blur-md border shadow-lg rounded-lg p-4 max-w-sm mx-auto sm:mx-0">
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
                className="w-full bg-primary/90 backdrop-blur-md text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/80 transition-colors"
              >
                Installer l'application
              </button>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-accent/80 hover:backdrop-blur-md hover:text-accent-foreground rounded-md transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
