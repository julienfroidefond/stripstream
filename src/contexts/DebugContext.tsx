"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { RequestTiming } from "@/lib/services/debug.service";
import { usePreferences } from "./PreferencesContext";

interface DebugContextType {
  logs: RequestTiming[];
  setLogs: (logs: RequestTiming[]) => void;
  addLog: (log: RequestTiming) => void;
  clearLogs: () => void;
  isRefreshing: boolean;
  setIsRefreshing: (refreshing: boolean) => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

interface DebugProviderProps {
  children: ReactNode;
}

export function DebugProvider({ children }: DebugProviderProps) {
  const [logs, setLogs] = useState<RequestTiming[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { preferences } = usePreferences();

  const addLog = (log: RequestTiming) => {
    setLogs(prevLogs => {
      // Éviter les doublons basés sur l'URL et le timestamp
      const exists = prevLogs.some(existingLog => 
        existingLog.url === log.url && existingLog.timestamp === log.timestamp
      );
      if (exists) return prevLogs;
      
      return [...prevLogs, log].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  };

  const clearLogs = async () => {
    try {
      // Vider le fichier côté serveur
      await fetch("/api/debug", { method: "DELETE" });
      // Vider le state côté client
      setLogs([]);
    } catch (error) {
      console.error("Erreur lors de la suppression des logs:", error);
      // Même en cas d'erreur, vider le state côté client
      setLogs([]);
    }
  };

  // Charger les logs au montage du provider et les rafraîchir périodiquement
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Ne pas faire de requête si le debug n'est pas activé
        if (!preferences.debug) {
          return;
        }

        setIsRefreshing(true);
        const debugResponse = await fetch("/api/debug");
        if (debugResponse.ok) {
          const serverLogs = await debugResponse.json();
          setLogs(serverLogs);
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des logs:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    fetchLogs();

    // Rafraîchir toutes les 10 secondes (moins fréquent pour éviter les conflits)
    const interval = setInterval(fetchLogs, 10000);

    return () => clearInterval(interval);
  }, [preferences.debug]);

  return (
    <DebugContext.Provider 
      value={{ 
        logs, 
        setLogs, 
        addLog, 
        clearLogs, 
        isRefreshing, 
        setIsRefreshing 
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
}
