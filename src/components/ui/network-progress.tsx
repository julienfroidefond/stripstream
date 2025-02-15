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

  const totalProgress = Object.values(activeRequests).reduce((acc, curr) => acc + curr, 0);
  const requestCount = Object.keys(activeRequests).length;
  const averageProgress = requestCount > 0 ? totalProgress / requestCount : 0;

  return (
    <NetworkProgressContext.Provider value={{ startProgress, updateProgress, completeProgress }}>
      {children}
      {requestCount > 0 && (
        <>
          {/* Barre de progression en haut */}
          <div className="fixed top-0 left-0 right-0 z-50">
            <div className="h-1 w-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${averageProgress}%` }}
              />
            </div>
          </div>

          {/* Indicateur de progression au centre */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="bg-background/80 backdrop-blur-sm rounded-lg p-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">{Math.round(averageProgress)}%</span>
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
