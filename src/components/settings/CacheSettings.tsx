"use client";

import { useState, useEffect } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Loader2, HardDrive } from "lucide-react";
import { CacheModeSwitch } from "@/components/settings/CacheModeSwitch";
import { Label } from "@/components/ui/label";
import type { TTLConfigData } from "@/types/komga";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CacheSettingsProps {
  initialTTLConfig: TTLConfigData | null;
}

interface CacheSizeInfo {
  sizeInBytes: number;
  itemCount: number;
}

export function CacheSettings({ initialTTLConfig }: CacheSettingsProps) {
  const { t } = useTranslate();
  const { toast } = useToast();
  const [isCacheClearing, setIsCacheClearing] = useState(false);
  const [isServiceWorkerClearing, setIsServiceWorkerClearing] = useState(false);
  const [serverCacheSize, setServerCacheSize] = useState<CacheSizeInfo | null>(null);
  const [swCacheSize, setSwCacheSize] = useState<number | null>(null);
  const [isLoadingCacheSize, setIsLoadingCacheSize] = useState(true);
  const [ttlConfig, setTTLConfig] = useState<TTLConfigData>(
    initialTTLConfig || {
      defaultTTL: 5,
      homeTTL: 5,
      librariesTTL: 1440,
      seriesTTL: 5,
      booksTTL: 5,
      imagesTTL: 1440,
    }
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
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

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();

          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.clone().blob();
              totalSize += blob.size;
            }
          }
        }

        setSwCacheSize(totalSize);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération de la taille du cache:", error);
    } finally {
      setIsLoadingCacheSize(false);
    }
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

      // Rafraîchir la taille du cache
      await fetchCacheSize();
    } catch (error) {
      console.error("Erreur:", error);
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
        toast({
          title: t("settings.cache.title"),
          description: t("settings.cache.messages.serviceWorkerCleared"),
        });

        // Rafraîchir la taille du cache
        await fetchCacheSize();
      }
    } catch (error) {
      console.error("Erreur lors de la suppression des caches:", error);
      toast({
        variant: "destructive",
        title: t("settings.cache.error.title"),
        description: t("settings.cache.error.serviceWorkerMessage"),
      });
    } finally {
      setIsServiceWorkerClearing(false);
    }
  };

  const handleTTLChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      console.error("Erreur lors de la sauvegarde:", error);
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
            <div className="grid gap-2 sm:grid-cols-2">
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
                  <div className="text-sm text-muted-foreground">{t("settings.cache.size.error")}</div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">{t("settings.cache.size.serviceWorker")}</div>
                {swCacheSize !== null ? (
                  <div className="text-sm text-muted-foreground">{formatBytes(swCacheSize)}</div>
                ) : (
                  <div className="text-sm text-muted-foreground">{t("settings.cache.size.error")}</div>
                )}
              </div>
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
        </form>
      </CardContent>
    </Card>
  );
}
