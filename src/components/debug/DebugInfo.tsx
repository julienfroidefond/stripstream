"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  X,
  Database,
  Minimize2,
  Maximize2,
  Clock,
  CircleDot,
  Layout,
  RefreshCw,
  Globe,
} from "lucide-react";
import { CacheType } from "@/lib/services/base-api.service";

interface RequestTiming {
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  timestamp: string;
  fromCache: boolean;
  cacheType?: CacheType;
  mongoAccess?: {
    operation: string;
    duration: number;
  };
  pageRender?: {
    page: string;
  };
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(duration: number) {
  return Math.round(duration);
}

export function DebugInfo() {
  const [logs, setLogs] = useState<RequestTiming[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pathname = usePathname();

  const fetchLogs = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/debug");
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des logs:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Rafraîchir les logs au montage et à chaque changement de page
  useEffect(() => {
    fetchLogs();
  }, [pathname]);

  // Rafraîchir les logs périodiquement si la fenêtre n'est pas minimisée
  useEffect(() => {
    if (isMinimized) return;

    const interval = setInterval(() => {
      fetchLogs();
    }, 5000); // Rafraîchir toutes les 5 secondes

    return () => clearInterval(interval);
  }, [isMinimized]);

  const clearLogs = async () => {
    try {
      await fetch("/api/debug", { method: "DELETE" });
      setLogs([]);
    } catch (error) {
      console.error("Erreur lors de la suppression des logs:", error);
    }
  };

  const sortedLogs = [...logs].reverse();

  return (
    <div
      className={`fixed bottom-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg p-4 text-zinc-100 z-50 ${
        isMinimized ? "w-auto" : "w-[800px] max-h-[50vh] overflow-auto"
      }`}
    >
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg">DEBUG</h2>
          {!isMinimized && (
            <span className="text-xs text-zinc-400">
              {sortedLogs.length} entrée{sortedLogs.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="hover:bg-zinc-700 rounded-full p-1.5"
            aria-label="Rafraîchir les logs"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-zinc-700 rounded-full p-1.5"
            aria-label={isMinimized ? "Agrandir" : "Minimiser"}
          >
            {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
          </button>
          <button
            onClick={clearLogs}
            className="hover:bg-zinc-700 rounded-full p-1.5"
            aria-label="Effacer les logs"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-3">
          {sortedLogs.length === 0 ? (
            <p className="text-sm opacity-75">Aucune requête enregistrée</p>
          ) : (
            sortedLogs.map((log, index) => (
              <div key={index} className="text-sm space-y-1.5 bg-zinc-800 p-2 rounded">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {log.fromCache && (
                      <div title={`Cache: ${log.cacheType || "DEFAULT"}`} className="flex-shrink-0">
                        <Database className="h-4 w-4" />
                      </div>
                    )}
                    {log.mongoAccess && (
                      <div
                        title={`MongoDB: ${log.mongoAccess.operation}`}
                        className="flex-shrink-0"
                      >
                        <CircleDot className="h-4 w-4 text-blue-400" />
                      </div>
                    )}
                    {log.pageRender && (
                      <div title={`Page Render: ${log.pageRender.page}`} className="flex-shrink-0">
                        <Layout className="h-4 w-4 text-purple-400" />
                      </div>
                    )}
                    {!log.fromCache && !log.mongoAccess && !log.pageRender && (
                      <div title="API Call" className="flex-shrink-0">
                        <Globe className="h-4 w-4 text-rose-400" />
                      </div>
                    )}
                    <span className="font-medium truncate" title={log.url}>
                      {log.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1 text-zinc-400" title="Heure du log">
                      <Clock className="h-3 w-3" />
                      <span>{formatTime(log.timestamp)}</span>
                    </div>
                    <span
                      className={`${
                        log.pageRender
                          ? "text-purple-400"
                          : log.mongoAccess
                          ? "text-blue-400"
                          : log.fromCache
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {formatDuration(log.duration)}ms
                    </span>
                    {log.mongoAccess && (
                      <span className="text-blue-400" title="Temps d'accès MongoDB">
                        +{formatDuration(log.mongoAccess.duration)}ms
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      log.pageRender
                        ? "bg-purple-500"
                        : log.fromCache
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                    style={{
                      width: `${Math.min((log.duration / 1000) * 100, 100)}%`,
                    }}
                  />
                  {log.mongoAccess && (
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${Math.min((log.mongoAccess.duration / 1000) * 100, 100)}%`,
                        marginTop: "-6px",
                      }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
