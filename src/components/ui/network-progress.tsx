"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NetworkProgressContextType {
  startProgress: (requestId: string) => void;
  updateProgress: (requestId: string, progress: number) => void;
  completeProgress: (requestId: string) => void;
}

const NetworkProgressContext = createContext<NetworkProgressContextType | null>(null);

export function NetworkProgressProvider({ children }: { children: React.ReactNode }) {
  const [activeRequests, setActiveRequests] = useState<Record<string, number>>({});

  const startProgress = useCallback((requestId: string) => {
    setActiveRequests((prev) => ({ ...prev, [requestId]: 0 }));
  }, []);

  const updateProgress = useCallback((requestId: string, progress: number) => {
    setActiveRequests((prev) => ({ ...prev, [requestId]: progress }));
  }, []);

  const completeProgress = useCallback((requestId: string) => {
    setActiveRequests((prev) => {
      const newRequests = { ...prev };
      delete newRequests[requestId];
      return newRequests;
    });
  }, []);

  const requestCount = Object.keys(activeRequests).length;

  return (
    <NetworkProgressContext.Provider value={{ startProgress, updateProgress, completeProgress }}>
      {children}
      {requestCount > 0 && (
        <>
          {/* Barre de progression en haut */}
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-0.5 w-full bg-muted overflow-hidden">
              <div className="h-full bg-primary animate-pulse" />
            </div>
          </div>

          {/* Indicateur de chargement au centre */}
          <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs font-medium">Chargement</span>
            </div>
          </div>
        </>
      )}
    </NetworkProgressContext.Provider>
  );
}

export function useNetworkProgress() {
  const context = useContext(NetworkProgressContext);
  if (!context) {
    throw new Error("useNetworkProgress must be used within a NetworkProgressProvider");
  }
  return context;
}

// Fonction utilitaire pour simuler une progression
export async function simulateProgress(
  requestId: string,
  updateFn: (requestId: string, progress: number) => void,
  duration: number = 1000
) {
  const steps = 20;
  const increment = 100 / steps;
  const stepDuration = duration / steps;

  for (let i = 1; i <= steps; i++) {
    await new Promise((resolve) => setTimeout(resolve, stepDuration));
    updateFn(requestId, Math.min(increment * i, 99));
  }
}
