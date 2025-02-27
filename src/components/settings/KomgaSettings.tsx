"use client";

import { useState } from "react";
import { useTranslate } from "@/hooks/useTranslate";
import { useToast } from "@/components/ui/use-toast";
import { Network, Loader2 } from "lucide-react";
import { KomgaConfig } from "@/types/komga";

interface KomgaSettingsProps {
  initialConfig: KomgaConfig | null;
}

export function KomgaSettings({ initialConfig }: KomgaSettingsProps) {
  const { t } = useTranslate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState({
    serverUrl: initialConfig?.url || "",
    username: initialConfig?.username || "",
    password: initialConfig?.password || "",
    authHeader: initialConfig?.authHeader || "",
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [localInitialConfig, setLocalInitialConfig] = useState(initialConfig);

  const hasToShowEditForm =
    localInitialConfig && config.serverUrl !== null && config.username !== null;
  const shouldShowForm = !hasToShowEditForm || isEditingConfig;

  const handleTest = async () => {
    setIsLoading(true);

    const form = document.querySelector("form") as HTMLFormElement;
    const formData = new FormData(form);
    const serverUrl = formData.get("serverUrl") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/komga/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl: serverUrl.trim(),
          username,
          password: password || config.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("settings.komga.error.message"));
      }

      toast({
        title: t("settings.komga.title"),
        description: t("settings.komga.messages.connectionSuccess"),
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        variant: "destructive",
        title: t("settings.komga.error.title"),
        description: t("settings.komga.error.message"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const serverUrl = formData.get("serverUrl") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const newConfig = {
      serverUrl: serverUrl.trim(),
      username,
      password,
      authHeader: config.authHeader,
    };

    try {
      const response = await fetch("/api/komga/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: newConfig.serverUrl,
          username: newConfig.username,
          password: newConfig.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("settings.komga.error.message"));
      }

      const savedConfig = await response.json();

      setConfig(newConfig);
      setLocalInitialConfig({
        url: newConfig.serverUrl,
        username: newConfig.username,
        userId: savedConfig.userId,
        authHeader: savedConfig.authHeader,
      });
      setIsEditingConfig(false);

      toast({
        title: t("settings.komga.title"),
        description: t("settings.komga.messages.configSaved"),
      });

      // Forcer un rechargement complet de la page
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        variant: "destructive",
        title: t("settings.komga.error.title"),
        description: t("settings.komga.error.message"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Network className="h-5 w-5" />
            {t("settings.komga.title")}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{t("settings.komga.description")}</p>
        </div>

        {!shouldShowForm ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("settings.komga.serverUrl")}</label>
                <p className="text-sm text-muted-foreground">{config.serverUrl}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("settings.komga.email")}</label>
                <p className="text-sm text-muted-foreground">{config.username}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("settings.komga.password")}</label>
                <p className="text-sm text-muted-foreground">••••••••</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingConfig(true)}
              className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("settings.komga.buttons.edit")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="serverUrl" className="text-sm font-medium">
                  {t("settings.komga.serverUrl")}
                </label>
                <input
                  type="url"
                  id="serverUrl"
                  name="serverUrl"
                  required
                  value={config.serverUrl}
                  onChange={handleInputChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">
                  {t("settings.komga.email")}
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  value={config.username}
                  onChange={handleInputChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  {t("settings.komga.password")}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={config.password}
                  onChange={handleInputChange}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("settings.komga.buttons.saving")}
                  </>
                ) : (
                  t("settings.komga.buttons.save")
                )}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("settings.komga.buttons.testing")}
                  </>
                ) : (
                  t("settings.komga.buttons.test")
                )}
              </button>
              {initialConfig && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingConfig(false);
                    setConfig({
                      serverUrl: initialConfig.url,
                      username: initialConfig.username,
                      password: "",
                      authHeader: initialConfig.authHeader,
                    });
                  }}
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t("settings.komga.buttons.cancel")}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
