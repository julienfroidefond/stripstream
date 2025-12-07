"use client";

import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Loader2, HardDrive, List, ChevronDown, ChevronUp, ImageOff } from "lucide-react";
import { CacheModeSwitch } from "@/components/settings/CacheModeSwitch";
import { Label } from "@/components/ui/label";
import type { TTLConfigData } from "@/types/komga";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImageCache } from "@/contexts/ImageCacheContext";
import logger from "@/lib/logger";

interface CacheSettingsProps {
  initialTTLConfig: TTLConfigData | null;
}

interface CacheSizeInfo {
  sizeInBytes: number;
  itemCount: number;
}

interface CacheEntry {
  key: string;
  size: number;
  expiry: number;
  isExpired: boolean;
}

interface ServiceWorkerCacheEntry {
  url: string;
  size: number;
  cacheName: string;
}

export function CacheSettings({ initialTTLConfig }: CacheSettingsProps) {
  const { t } = useTranslate();
  const { toast } = useToast();
  const { flushImageCache } = useImageCache();
  const [isCacheClearing, setIsCacheClearing] = useState(false);
  const [isServiceWorkerClearing, setIsServiceWorkerClearing] = useState(false);
  const [serverCacheSize, setServerCacheSize] = useState<CacheSizeInfo | null>(null);
  const [swCacheSize, setSwCacheSize] = useState<number | null>(null);
  const [apiCacheSize, setApiCacheSize] = useState<number | null>(null);
  const [isLoadingCacheSize, setIsLoadingCacheSize] = useState(true);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [showEntries, setShowEntries] = useState(false);
  const [swCacheEntries, setSwCacheEntries] = useState<ServiceWorkerCacheEntry[]>([]);
  const [isLoadingSwEntries, setIsLoadingSwEntries] = useState(false);
  const [showSwEntries, setShowSwEntries] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [ttlConfig, setTTLConfig] = useState<TTLConfigData>(
    initialTTLConfig || {
      defaultTTL: 5,
      homeTTL: 5,
      librariesTTL: 1440,
      seriesTTL: 5,
      booksTTL: 5,
      imagesTTL: 1440,
      imageCacheMaxAge: 2592000,
    }
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeRemaining = (expiry: number): string => {
    const now = Date.now();
    const diff = expiry - now;

    if (diff < 0) return t("settings.cache.entries.expired");

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return t("settings.cache.entries.daysRemaining", { count: days });
    if (hours > 0) return t("settings.cache.entries.hoursRemaining", { count: hours });
    if (minutes > 0) return t("settings.cache.entries.minutesRemaining", { count: minutes });
    return t("settings.cache.entries.lessThanMinute");
  };

  const getCacheType = (key: string): string => {
    if (key.includes("/home")) return "HOME";
    if (key.includes("/libraries")) return "LIBRARIES";
    if (key.includes("/series/")) return "SERIES";
    if (key.includes("/books/")) return "BOOKS";
    if (key.includes("/images/")) return "IMAGES";
    return "DEFAULT";
  };

  const fetchCacheSize = async () => {
    setIsLoadingCacheSize(true);
    try {
      // Récupérer la taille du cache serveur
      const serverResponse = await fetch("/api/komga/cache/size");
      if (serverResponse.ok) {
        const serverData = await serverResponse.json();
        setServerCacheSize({
          sizeInBytes: serverData.sizeInBytes,
          itemCount: serverData.itemCount,
        });
      }

      // Calculer la taille du cache Service Worker
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        let apiSize = 0;

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();

          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.clone().blob();
              totalSize += blob.size;

              // Calculer la taille du cache API séparément
              if (cacheName.includes("api")) {
                apiSize += blob.size;
              }
            }
          }
        }

        setSwCacheSize(totalSize);
        setApiCacheSize(apiSize);
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération de la taille du cache:");
    } finally {
      setIsLoadingCacheSize(false);
    }
  };

  const fetchCacheEntries = async () => {
    setIsLoadingEntries(true);
    try {
      const response = await fetch("/api/komga/cache/entries");
      if (response.ok) {
        const data = await response.json();
        setCacheEntries(data.entries);
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération des entrées du cache:");
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const toggleShowEntries = () => {
    if (!showEntries && cacheEntries.length === 0) {
      fetchCacheEntries();
    }
    setShowEntries(!showEntries);
  };

  const fetchSwCacheEntries = async () => {
    setIsLoadingSwEntries(true);
    try {
      if ("caches" in window) {
        const entries: ServiceWorkerCacheEntry[] = [];
        const cacheNames = await caches.keys();

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();

          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.clone().blob();
              entries.push({
                url: request.url,
                size: blob.size,
                cacheName,
              });
            }
          }
        }

        setSwCacheEntries(entries);
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la récupération des entrées du cache SW:");
    } finally {
      setIsLoadingSwEntries(false);
    }
  };

  const toggleShowSwEntries = () => {
    if (!showSwEntries && swCacheEntries.length === 0) {
      fetchSwCacheEntries();
    }
    setShowSwEntries(!showSwEntries);
  };

  const getPathGroup = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const segments = path.split("/").filter(Boolean);

      if (segments.length === 0) return "/";

      // Pour /api/komga/images, grouper par type (series/books)
      if (
        segments[0] === "api" &&
        segments[1] === "komga" &&
        segments[2] === "images" &&
        segments[3]
      ) {
        return `/${segments[0]}/${segments[1]}/${segments[2]}/${segments[3]}`;
      }

      // Pour les autres, garder juste le premier segment
      return `/${segments[0]}`;
    } catch {
      return "Autres";
    }
  };

  const getBaseUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  };

  const groupVersions = (entries: ServiceWorkerCacheEntry[]) => {
    const grouped = entries.reduce(
      (acc, entry) => {
        const baseUrl = getBaseUrl(entry.url);
        if (!acc[baseUrl]) {
          acc[baseUrl] = [];
        }
        acc[baseUrl].push(entry);
        return acc;
      },
      {} as Record<string, ServiceWorkerCacheEntry[]>
    );

    // Trier par date (le plus récent en premier) basé sur le paramètre v
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const aVersion = new URL(a.url).searchParams.get("v") || "0";
        const bVersion = new URL(b.url).searchParams.get("v") || "0";
        return Number(bVersion) - Number(aVersion);
      });
    });

    return grouped;
  };

  const groupEntriesByPath = (entries: ServiceWorkerCacheEntry[]) => {
    const grouped = entries.reduce(
      (acc, entry) => {
        const pathGroup = getPathGroup(entry.url);
        if (!acc[pathGroup]) {
          acc[pathGroup] = [];
        }
        acc[pathGroup].push(entry);
        return acc;
      },
      {} as Record<string, ServiceWorkerCacheEntry[]>
    );

    // Trier chaque groupe par taille décroissante
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => b.size - a.size);
    });

    // Trier les groupes par taille totale décroissante
    const sortedGroups: Record<string, ServiceWorkerCacheEntry[]> = {};
    Object.entries(grouped)
      .sort((a, b) => {
        const aSize = getTotalSizeByType(a[1]);
        const bSize = getTotalSizeByType(b[1]);
        return bSize - aSize;
      })
      .forEach(([key, value]) => {
        sortedGroups[key] = value;
      });

    return sortedGroups;
  };

  const getTotalSizeByType = (entries: ServiceWorkerCacheEntry[]): number => {
    return entries.reduce((sum, entry) => sum + entry.size, 0);
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const toggleVersions = (fileName: string) => {
    setExpandedVersions((prev) => ({
      ...prev,
      [fileName]: !prev[fileName],
    }));
  };

  useEffect(() => {
    fetchCacheSize();
  }, []);

  const handleClearCache = async () => {
    setIsCacheClearing(true);

    try {
      const response = await fetch("/api/komga/cache/clear", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("settings.cache.error.message"));
      }

      toast({
        title: t("settings.cache.title"),
        description: t("settings.cache.messages.cleared"),
      });

      // Rafraîchir la taille du cache et les entrées
      await fetchCacheSize();
      if (showEntries) {
        await fetchCacheEntries();
      }
      if (showSwEntries) {
        await fetchSwCacheEntries();
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur:");
      toast({
        variant: "destructive",
        title: t("settings.cache.error.title"),
        description: t("settings.cache.error.message"),
      });
    } finally {
      setIsCacheClearing(false);
    }
  };

  const handleClearServiceWorkerCache = async () => {
    setIsServiceWorkerClearing(true);
    try {
      if ("serviceWorker" in navigator && "caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));

        // Forcer la mise à jour du service worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }

        toast({
          title: t("settings.cache.title"),
          description: t("settings.cache.messages.serviceWorkerCleared"),
        });

        // Rafraîchir la taille du cache et les entrées
        await fetchCacheSize();
        if (showEntries) {
          await fetchCacheEntries();
        }
        if (showSwEntries) {
          await fetchSwCacheEntries();
        }

        // Recharger la page après 1 seconde pour réenregistrer le SW
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la suppression des caches:");
      toast({
        variant: "destructive",
        title: t("settings.cache.error.title"),
        description: t("settings.cache.error.serviceWorkerMessage"),
      });
    } finally {
      setIsServiceWorkerClearing(false);
    }
  };

  const handleFlushImageCache = () => {
    flushImageCache();
    toast({
      title: t("settings.cache.title"),
      description: t("settings.cache.messages.imageCacheFlushed"),
    });
  };

  const handleTTLChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setTTLConfig((prev) => ({
      ...prev,
      [name]: parseInt(value || "0", 10),
    }));
  };

  const handleSaveTTL = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const response = await fetch("/api/komga/ttl-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ttlConfig),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("settings.cache.error.message"));
      }

      toast({
        title: t("settings.cache.title"),
        description: t("settings.cache.messages.ttlSaved"),
      });
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la sauvegarde:");
      toast({
        variant: "destructive",
        title: t("settings.cache.error.title"),
        description: t("settings.cache.error.messagettl"),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          {t("settings.cache.title")}
        </CardTitle>
        <CardDescription>{t("settings.cache.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <Label htmlFor="cache-mode">{t("settings.cache.mode.label")}</Label>
            <p className="text-sm text-muted-foreground">{t("settings.cache.mode.description")}</p>
          </div>
          <CacheModeSwitch />
        </div>

        {/* Informations sur la taille du cache */}
        <div className="rounded-md border bg-muted/50 backdrop-blur-md p-4 space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <HardDrive className="h-4 w-4" />
            {t("settings.cache.size.title")}
          </div>

          {isLoadingCacheSize ? (
            <div className="text-sm text-muted-foreground">{t("settings.cache.size.loading")}</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">{t("settings.cache.size.server")}</div>
                {serverCacheSize ? (
                  <div className="text-sm text-muted-foreground">
                    <div>{formatBytes(serverCacheSize.sizeInBytes)}</div>
                    <div className="text-xs">
                      {t("settings.cache.size.items", { count: serverCacheSize.itemCount })}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("settings.cache.size.error")}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t("settings.cache.size.serviceWorker")}</div>
                {swCacheSize !== null ? (
                  <div className="text-sm text-muted-foreground">{formatBytes(swCacheSize)}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("settings.cache.size.error")}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t("settings.cache.size.api")}</div>
                {apiCacheSize !== null ? (
                  <div className="text-sm text-muted-foreground">{formatBytes(apiCacheSize)}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t("settings.cache.size.error")}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Aperçu des entrées du cache serveur */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={toggleShowEntries}
            className="w-full flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {t("settings.cache.entries.serverTitle")}
            </span>
            {showEntries ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showEntries && (
            <div className="rounded-md border bg-muted/30 backdrop-blur-md">
              {isLoadingEntries ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  {t("settings.cache.entries.loading")}
                </div>
              ) : cacheEntries.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {t("settings.cache.entries.empty")}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <div className="divide-y">
                    {cacheEntries.map((entry, index) => (
                      <div
                        key={index}
                        className={`p-3 space-y-1 ${entry.isExpired ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-xs truncate" title={entry.key}>
                              {entry.key}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
                                {getCacheType(entry.key)}
                              </span>
                              <span>{formatBytes(entry.size)}</span>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <div
                              className={`font-medium ${entry.isExpired ? "text-destructive" : "text-muted-foreground"}`}
                            >
                              {getTimeRemaining(entry.expiry)}
                            </div>
                            <div
                              className="text-muted-foreground/70"
                              title={formatDate(entry.expiry)}
                            >
                              {new Date(entry.expiry).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Aperçu des entrées du cache service worker */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            onClick={toggleShowSwEntries}
            className="w-full flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {t("settings.cache.entries.serviceWorkerTitle")}
            </span>
            {showSwEntries ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showSwEntries && (
            <div className="rounded-md border bg-muted/30 backdrop-blur-md">
              {isLoadingSwEntries ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  {t("settings.cache.entries.loading")}
                </div>
              ) : swCacheEntries.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {t("settings.cache.entries.empty")}
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {(() => {
                    const grouped = groupEntriesByPath(swCacheEntries);
                    return (
                      <div className="divide-y">
                        {Object.entries(grouped).map(([pathGroup, entries]) => {
                          const isExpanded = expandedGroups[pathGroup];
                          return (
                            <div key={pathGroup} className="p-3 space-y-2">
                              <button
                                type="button"
                                onClick={() => toggleGroup(pathGroup)}
                                className="w-full flex items-center justify-between hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                              >
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronUp className="h-3 w-3" />
                                  )}
                                  <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium font-mono">
                                    {pathGroup}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({entries.length} {entries.length > 1 ? "éléments" : "élément"})
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground font-medium">
                                  {formatBytes(getTotalSizeByType(entries))}
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="space-y-1 pl-2">
                                  {(() => {
                                    const versionGroups = groupVersions(entries);
                                    return Object.entries(versionGroups).map(
                                      ([baseUrl, versions]) => {
                                        const hasMultipleVersions = versions.length > 1;
                                        const isVersionExpanded = expandedVersions[baseUrl];
                                        const totalSize = versions.reduce(
                                          (sum, v) => sum + v.size,
                                          0
                                        );

                                        if (!hasMultipleVersions) {
                                          const entry = versions[0];
                                          return (
                                            <div key={baseUrl} className="py-1">
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                  <div
                                                    className="font-mono text-xs truncate text-muted-foreground"
                                                    title={entry.url}
                                                  >
                                                    {entry.url.replace(/^https?:\/\/[^/]+/, "")}
                                                  </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                  {formatBytes(entry.size)}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div key={baseUrl} className="py-1">
                                            <button
                                              type="button"
                                              onClick={() => toggleVersions(baseUrl)}
                                              className="w-full flex items-start justify-between gap-2 hover:bg-muted/30 rounded p-1 -m-1 transition-colors"
                                            >
                                              <div className="flex-1 min-w-0 flex items-center gap-1">
                                                {isVersionExpanded ? (
                                                  <ChevronDown className="h-3 w-3 flex-shrink-0" />
                                                ) : (
                                                  <ChevronUp className="h-3 w-3 flex-shrink-0" />
                                                )}
                                                <div
                                                  className="font-mono text-xs truncate text-muted-foreground"
                                                  title={baseUrl}
                                                >
                                                  {baseUrl}
                                                </div>
                                                <span className="inline-flex items-center rounded-full bg-orange-500/10 px-1.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400 flex-shrink-0">
                                                  {versions.length} versions
                                                </span>
                                              </div>
                                              <div className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                                                {formatBytes(totalSize)}
                                              </div>
                                            </button>
                                            {isVersionExpanded && (
                                              <div className="pl-4 mt-1 space-y-1">
                                                {versions.map((version, vIdx) => (
                                                  <div
                                                    key={vIdx}
                                                    className="py-0.5 flex items-start justify-between gap-2"
                                                  >
                                                    <div className="flex-1 min-w-0">
                                                      <div
                                                        className="font-mono text-xs truncate text-muted-foreground/70"
                                                        title={version.url}
                                                      >
                                                        {new URL(version.url).search ||
                                                          "(no version)"}
                                                      </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground/70 whitespace-nowrap">
                                                      {formatBytes(version.size)}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      }
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Formulaire TTL */}
        <form onSubmit={handleSaveTTL} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="defaultTTL" className="text-sm font-medium">
                {t("settings.cache.ttl.default")}
              </label>
              <input
                type="number"
                id="defaultTTL"
                name="defaultTTL"
                min="1"
                value={ttlConfig.defaultTTL}
                onChange={handleTTLChange}
                className="flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="homeTTL" className="text-sm font-medium">
                {t("settings.cache.ttl.home")}
              </label>
              <input
                type="number"
                id="homeTTL"
                name="homeTTL"
                min="1"
                value={ttlConfig.homeTTL}
                onChange={handleTTLChange}
                className="flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="librariesTTL" className="text-sm font-medium">
                {t("settings.cache.ttl.libraries")}
              </label>
              <input
                type="number"
                id="librariesTTL"
                name="librariesTTL"
                min="1"
                value={ttlConfig.librariesTTL}
                onChange={handleTTLChange}
                className="flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="seriesTTL" className="text-sm font-medium">
                {t("settings.cache.ttl.series")}
              </label>
              <input
                type="number"
                id="seriesTTL"
                name="seriesTTL"
                min="1"
                value={ttlConfig.seriesTTL}
                onChange={handleTTLChange}
                className="flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="booksTTL" className="text-sm font-medium">
                {t("settings.cache.ttl.books")}
              </label>
              <input
                type="number"
                id="booksTTL"
                name="booksTTL"
                min="1"
                value={ttlConfig.booksTTL}
                onChange={handleTTLChange}
                className="flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="imagesTTL" className="text-sm font-medium">
                {t("settings.cache.ttl.images")}
              </label>
              <input
                type="number"
                id="imagesTTL"
                name="imagesTTL"
                min="1"
                value={ttlConfig.imagesTTL}
                onChange={handleTTLChange}
                className="flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <label htmlFor="imageCacheMaxAge" className="text-sm font-medium">
                  {t("settings.cache.ttl.imageCacheMaxAge.label")}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t("settings.cache.ttl.imageCacheMaxAge.description")}
                </p>
              </div>
              <select
                id="imageCacheMaxAge"
                name="imageCacheMaxAge"
                value={ttlConfig.imageCacheMaxAge}
                onChange={handleTTLChange}
                className="flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="0">
                  {t("settings.cache.ttl.imageCacheMaxAge.options.noCache")}
                </option>
                <option value="3600">
                  {t("settings.cache.ttl.imageCacheMaxAge.options.oneHour")}
                </option>
                <option value="86400">
                  {t("settings.cache.ttl.imageCacheMaxAge.options.oneDay")}
                </option>
                <option value="604800">
                  {t("settings.cache.ttl.imageCacheMaxAge.options.oneWeek")}
                </option>
                <option value="2592000">
                  {t("settings.cache.ttl.imageCacheMaxAge.options.oneMonth")}
                </option>
                <option value="31536000">
                  {t("settings.cache.ttl.imageCacheMaxAge.options.oneYear")}
                </option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center rounded-md bg-primary/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {t("settings.cache.buttons.saveTTL")}
            </button>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={isCacheClearing}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-destructive/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isCacheClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.cache.buttons.clearing")}
                </>
              ) : (
                t("settings.cache.buttons.clear")
              )}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClearServiceWorkerCache}
              disabled={isServiceWorkerClearing}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-destructive/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {isServiceWorkerClearing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.cache.buttons.clearingServiceWorker")}
                </>
              ) : (
                t("settings.cache.buttons.clearServiceWorker")
              )}
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleFlushImageCache}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-orange-500/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-white ring-offset-background transition-colors hover:bg-orange-500/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ImageOff className="mr-2 h-4 w-4" />
              {t("settings.cache.buttons.flushImageCache")}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
