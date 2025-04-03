"use client";

import { useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import { CacheModeSwitch } from "@/components/settings/CacheModeSwitch";
import { Label } from "@/components/ui/label";
import type { TTLConfigData } from "@/types/komga";

interface CacheSettingsProps {
  initialTTLConfig: TTLConfigData | null;
}

export function CacheSettings({ initialTTLConfig }: CacheSettingsProps) {
  const { t } = useTranslate();
  const { toast } = useToast();
  const [isCacheClearing, setIsCacheClearing] = useState(false);
  const [isServiceWorkerClearing, setIsServiceWorkerClearing] = useState(false);
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
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t("settings.cache.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.cache.description")}</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <Label htmlFor="cache-mode">{t("settings.cache.mode.label")}</Label>
            <p className="text-sm text-muted-foreground">{t("settings.cache.mode.description")}</p>
          </div>
          <CacheModeSwitch />
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              {t("settings.cache.buttons.saveTTL")}
            </button>
            <button
              type="button"
              onClick={handleClearCache}
              disabled={isCacheClearing}
              className="flex-1 inline-flex items-center justify-center rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
              className="flex-1 inline-flex items-center justify-center rounded-md bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
      </div>
    </div>
  );
}
