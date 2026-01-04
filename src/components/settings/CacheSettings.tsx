"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { useToast } from "@/components/ui/use-toast";
import { useServiceWorker } from "@/contexts/ServiceWorkerContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Database,
  Trash2,
  RefreshCw,
  HardDrive,
  Image,
  FileJson,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface CacheStats {
  static: { size: number; entries: number };
  api: { size: number; entries: number };
  images: { size: number; entries: number };
  books: { size: number; entries: number };
  total: number;
}

interface CacheEntry {
  url: string;
  size: number;
}

type CacheType = "static" | "api" | "images" | "books";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function extractPathFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

interface CacheItemProps {
  icon: React.ReactNode;
  label: string;
  size: number;
  entries: number;
  cacheType: CacheType;
  onClear?: () => void;
  isClearing?: boolean;
  description?: string;
  onLoadEntries: (cacheType: CacheType) => Promise<CacheEntry[] | null>;
}

function CacheItem({
  icon,
  label,
  size,
  entries,
  cacheType,
  onClear,
  isClearing,
  description,
  onLoadEntries,
}: CacheItemProps) {
  const { t } = useTranslate();
  const [isOpen, setIsOpen] = useState(false);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[] | null>(null);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);

  const handleToggle = async (open: boolean) => {
    setIsOpen(open);
    if (open && !cacheEntries && !isLoadingEntries) {
      setIsLoadingEntries(true);
      const loadedEntries = await onLoadEntries(cacheType);
      setCacheEntries(loadedEntries);
      setIsLoadingEntries(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <div className="border-b last:border-b-0">
        <div className="flex items-center justify-between py-3 px-1">
          <CollapsibleTrigger asChild disabled={entries === 0}>
            <button
              className="flex items-center gap-3 flex-1 hover:bg-muted/50 rounded-lg transition-colors text-left py-1 px-2 -ml-2"
              disabled={entries === 0}
            >
              <div className="p-2 rounded-lg bg-muted">{icon}</div>
              <div className="flex-1">
                <p className="font-medium">{label}</p>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
              {entries > 0 && (
                <div className="w-5">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )}
            </button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-4 ml-2">
            <div className="text-right">
              <p className="font-mono text-sm">{formatBytes(size)}</p>
              <p className="text-xs text-muted-foreground">
                {entries} {entries === 1 ? t("settings.cache.entry") : t("settings.cache.entries")}
              </p>
            </div>
            {onClear && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                disabled={isClearing || entries === 0}
                className="h-8 w-8"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        <CollapsibleContent>
          <div className="pb-3 pl-12 pr-1">
            {isLoadingEntries ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t("settings.cache.loadingEntries")}
                </span>
              </div>
            ) : cacheEntries ? (
              <ScrollArea className="h-[200px] rounded-md border">
                <div className="p-2 space-y-1">
                  {cacheEntries.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5 px-2 text-xs hover:bg-muted/50 rounded"
                    >
                      <span className="font-mono truncate flex-1 mr-2" title={entry.url}>
                        {extractPathFromUrl(entry.url)}
                      </span>
                      <span className="font-mono text-muted-foreground whitespace-nowrap">
                        {formatBytes(entry.size)}
                      </span>
                    </div>
                  ))}
                  {cacheEntries.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      {t("settings.cache.noEntries")}
                    </p>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {t("settings.cache.loadError")}
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function CacheSettings() {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { isSupported, isReady, version, getCacheStats, getCacheEntries, clearCache } =
    useServiceWorker();

  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [clearingCache, setClearingCache] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    if (!isReady) return;

    setIsLoading(true);
    try {
      const cacheStats = await getCacheStats();
      setStats(cacheStats);
    } finally {
      setIsLoading(false);
    }
  }, [isReady, getCacheStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleClearCache = async (cacheType: "all" | "static" | "api" | "images") => {
    setClearingCache(cacheType);
    try {
      const success = await clearCache(cacheType);
      if (success) {
        toast({
          title: t("settings.cache.cleared"),
          description: t("settings.cache.clearedDesc"),
        });
        await loadStats();
      } else {
        toast({
          variant: "destructive",
          title: t("settings.error.title"),
          description: t("settings.cache.clearError"),
        });
      }
    } finally {
      setClearingCache(null);
    }
  };

  const handleLoadEntries = useCallback(
    async (cacheType: CacheType): Promise<CacheEntry[] | null> => {
      return getCacheEntries(cacheType);
    },
    [getCacheEntries]
  );

  // Calculer le pourcentage du cache utilisé (basé sur 100MB limite images)
  const maxCacheSize = 100 * 1024 * 1024; // 100MB
  const usagePercent = stats ? Math.min((stats.images.size / maxCacheSize) * 100, 100) : 0;

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t("settings.cache.title")}</CardTitle>
          </div>
          <CardDescription>{t("settings.cache.notSupported")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t("settings.cache.title")}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {isReady ? (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {version || "Active"}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <XCircle className="h-3 w-3 text-yellow-500" />
                {t("settings.cache.initializing")}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={loadStats}
              disabled={isLoading || !isReady}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <CardDescription>{t("settings.cache.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Barre de progression globale */}
        {stats && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("settings.cache.totalStorage")}</span>
              <span className="font-mono font-medium">{formatBytes(stats.total)}</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground text-right">
              {t("settings.cache.imagesQuota", { used: Math.round(usagePercent) })}
            </p>
          </div>
        )}

        {/* Liste des caches */}
        <div className="space-y-1">
          {stats ? (
            <>
              <CacheItem
                icon={<HardDrive className="h-4 w-4" />}
                label={t("settings.cache.static")}
                size={stats.static.size}
                entries={stats.static.entries}
                cacheType="static"
                description={t("settings.cache.staticDesc")}
                onClear={() => handleClearCache("static")}
                isClearing={clearingCache === "static"}
                onLoadEntries={handleLoadEntries}
              />
              <CacheItem
                icon={<FileJson className="h-4 w-4" />}
                label={t("settings.cache.api")}
                size={stats.api.size}
                entries={stats.api.entries}
                cacheType="api"
                description={t("settings.cache.apiDesc")}
                onClear={() => handleClearCache("api")}
                isClearing={clearingCache === "api"}
                onLoadEntries={handleLoadEntries}
              />
              <CacheItem
                icon={<Image className="h-4 w-4" />}
                label={t("settings.cache.images")}
                size={stats.images.size}
                entries={stats.images.entries}
                cacheType="images"
                description={t("settings.cache.imagesDesc")}
                onClear={() => handleClearCache("images")}
                isClearing={clearingCache === "images"}
                onLoadEntries={handleLoadEntries}
              />
              <CacheItem
                icon={<BookOpen className="h-4 w-4" />}
                label={t("settings.cache.books")}
                size={stats.books.size}
                entries={stats.books.entries}
                cacheType="books"
                description={t("settings.cache.booksDesc")}
                onLoadEntries={handleLoadEntries}
              />
            </>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t("settings.cache.unavailable")}
            </p>
          )}
        </div>

        {/* Bouton vider tout */}
        {stats && stats.total > 0 && (
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => handleClearCache("all")}
            disabled={clearingCache !== null}
          >
            {clearingCache === "all" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            {t("settings.cache.clearAll")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
