"use client";
import { useState } from "react";
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
  Filter,
  Calendar,
} from "lucide-react";
import type { CacheType } from "@/lib/services/base-api.service";
import { useTranslation } from "react-i18next";
import { useDebug } from "@/contexts/DebugContext";

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

type FilterType = "all" | "current-page" | "api" | "cache" | "mongodb" | "page-render";

export function DebugInfo() {
  const { logs, setLogs, clearLogs, isRefreshing, setIsRefreshing } = useDebug();
  const [isMinimized, setIsMinimized] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showFilters, setShowFilters] = useState(false);
  const pathname = usePathname();
  const { t } = useTranslation();

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

  // Fonction pour déterminer si une requête appartient à la page courante
  const isCurrentPageRequest = (log: RequestTiming): boolean => {
    if (log.pageRender) {
      return log.pageRender.page === pathname;
    }
    // Pour les requêtes API, on considère qu'elles appartiennent à la page courante
    // si elles ont été faites récemment (dans les 30 dernières secondes)
    const logTime = new Date(log.timestamp).getTime();
    const now = Date.now();
    return now - logTime < 30000; // 30 secondes
  };

  // Filtrer les logs selon le filtre sélectionné
  const filteredLogs = logs.filter((log) => {
    switch (filter) {
      case "current-page":
        return isCurrentPageRequest(log);
      case "api":
        return !log.fromCache && !log.mongoAccess && !log.pageRender;
      case "cache":
        return log.fromCache;
      case "mongodb":
        return log.mongoAccess;
      case "page-render":
        return log.pageRender;
      default:
        return true;
    }
  });

  const sortedLogs = [...filteredLogs].reverse();

  return (
    <div
      className={`fixed bottom-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg p-4 text-zinc-100 z-50 ${
        isMinimized ? "w-auto" : "w-[800px] max-h-[50vh] overflow-auto"
      }`}
    >
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-zinc-900 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-lg">{t("debug.title")}</h2>
          {!isMinimized && (
            <span className="text-xs text-zinc-400">
              {sortedLogs.length} {t("debug.entries", { count: sortedLogs.length })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isMinimized && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`hover:bg-zinc-700 rounded-full p-1.5 ${showFilters ? "bg-zinc-700" : ""}`}
              aria-label="Filtres"
            >
              <Filter className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={fetchLogs}
            className="hover:bg-zinc-700 rounded-full p-1.5"
            aria-label={t("debug.actions.refresh")}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="hover:bg-zinc-700 rounded-full p-1.5"
            aria-label={t(isMinimized ? "debug.actions.maximize" : "debug.actions.minimize")}
          >
            {isMinimized ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
          </button>
          <button
            onClick={clearLogs}
            className="hover:bg-zinc-700 rounded-full p-1.5"
            aria-label={t("debug.actions.clear")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!isMinimized && showFilters && (
        <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Toutes", icon: Calendar },
              { key: "current-page", label: "Page courante", icon: Layout },
              { key: "api", label: "API", icon: Globe },
              { key: "cache", label: "Cache", icon: Database },
              { key: "mongodb", label: "MongoDB", icon: CircleDot },
              { key: "page-render", label: "Rendu", icon: Layout },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setFilter(key as FilterType)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors ${
                  filter === key
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isMinimized && (
        <div className="space-y-3">
          {sortedLogs.length === 0 ? (
            <p className="text-sm opacity-75">{t("debug.noRequests")}</p>
          ) : (
            sortedLogs.map((log, index) => {
              const isCurrentPage = isCurrentPageRequest(log);
              return (
                <div 
                  key={index} 
                  className={`text-sm space-y-1.5 p-2 rounded border-l-2 ${
                    isCurrentPage 
                      ? "bg-blue-900/20 border-blue-500" 
                      : "bg-zinc-800 border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                    {log.fromCache && (
                      <div
                        title={t("debug.tooltips.cache", { type: log.cacheType || "DEFAULT" })}
                        className="flex-shrink-0"
                      >
                        <Database className="h-4 w-4" />
                      </div>
                    )}
                    {log.mongoAccess && (
                      <div
                        title={t("debug.tooltips.mongodb", {
                          operation: log.mongoAccess.operation,
                        })}
                        className="flex-shrink-0"
                      >
                        <CircleDot className="h-4 w-4 text-blue-400" />
                      </div>
                    )}
                    {log.pageRender && (
                      <div
                        title={t("debug.tooltips.pageRender", { page: log.pageRender.page })}
                        className="flex-shrink-0"
                      >
                        <Layout className="h-4 w-4 text-purple-400" />
                      </div>
                    )}
                    {!log.fromCache && !log.mongoAccess && !log.pageRender && (
                      <div title={t("debug.tooltips.apiCall")} className="flex-shrink-0">
                        <Globe className="h-4 w-4 text-rose-400" />
                      </div>
                    )}
                    <span className="font-medium truncate" title={log.url}>
                      {log.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className="flex items-center gap-1 text-zinc-400"
                      title={t("debug.tooltips.logTime")}
                    >
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
                      <span className="text-blue-400" title={t("debug.tooltips.mongoAccess")}>
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
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
