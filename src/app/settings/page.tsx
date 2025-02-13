"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Network, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { storageService } from "@/lib/services/storage.service";
import { AuthError } from "@/types/auth";
import { useToast } from "@/components/ui/use-toast";

interface ErrorMessage {
  message: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCacheClearing, setIsCacheClearing] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState({
    serverUrl: "",
    username: "",
    password: "",
  });
  const [ttlConfig, setTTLConfig] = useState({
    defaultTTL: 5,
    homeTTL: 5,
    librariesTTL: 1440,
    seriesTTL: 5,
    booksTTL: 5,
    imagesTTL: 1440,
  });

  useEffect(() => {
    // Charger la configuration existante
    const savedConfig = storageService.getCredentials();
    if (savedConfig) {
      setConfig({
        serverUrl: savedConfig.serverUrl,
        username: savedConfig.credentials?.username || "",
        password: savedConfig.credentials?.password || "",
      });
    }

    // Charger la configuration des TTL
    const savedTTLConfig = storageService.getTTLConfig();
    if (savedTTLConfig) {
      setTTLConfig(savedTTLConfig);
    }
  }, []);

  const handleClearCache = async () => {
    setIsCacheClearing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/komga/cache/clear", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la suppression du cache");
      }

      toast({
        title: "Cache supprimé",
        description: "Cache serveur supprimé avec succès",
      });
      router.refresh();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
      });
    } finally {
      setIsCacheClearing(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/komga/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl: config.serverUrl,
          username: config.username,
          password: config.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors du test de connexion");
      }

      toast({
        title: "Connexion réussie",
        description: "La connexion au serveur Komga a été établie avec succès",
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const serverUrl = formData.get("serverUrl") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const newConfig = {
      serverUrl: serverUrl.trim(),
      username,
      password,
    };

    storageService.setKomgaConfig(
      {
        serverUrl: newConfig.serverUrl,
        credentials: { username: newConfig.username, password: newConfig.password },
      },
      true
    );

    setConfig(newConfig);
    toast({
      title: "Configuration sauvegardée",
      description: "La configuration a été sauvegardée avec succès",
    });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setConfig((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTTLChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setTTLConfig((prev) => ({
      ...prev,
      [name]: parseInt(value || "0", 10),
    }));
  };

  const handleSaveTTL = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);

    storageService.setTTLConfig(ttlConfig);
    toast({
      title: "Configuration TTL sauvegardée",
      description: "La configuration des TTL a été sauvegardée avec succès",
    });
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Préférences</h1>
      </div>

      {/* Messages de succès/erreur */}
      {error && (
        <div className="rounded-md bg-destructive/15 p-4">
          <p className="text-sm text-destructive">{error.message}</p>
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/15 p-4">
          <p className="text-sm text-green-500">{success}</p>
        </div>
      )}

      <div className="grid gap-6">
        {/* Section Configuration Komga */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Network className="h-5 w-5" />
                Configuration Komga
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configurez les informations de connexion à votre serveur Komga.
              </p>
            </div>

            {/* Formulaire de configuration */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="serverUrl" className="text-sm font-medium">
                    L&apos;URL du serveur
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
                    L&apos;adresse email de connexion
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
                    Mot de passe
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
                  className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  Sauvegarder
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
                      Test en cours...
                    </>
                  ) : (
                    "Tester la connexion"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Section Configuration du Cache */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Configuration du Cache
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez les paramètres de mise en cache des données.
              </p>
            </div>

            {/* Formulaire TTL */}
            <form onSubmit={handleSaveTTL} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="defaultTTL" className="text-sm font-medium">
                    TTL par défaut (minutes)
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
                    TTL page d'accueil
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
                    TTL bibliothèques
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
                    TTL séries
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
                    TTL tomes
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
                    TTL images
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
                  Sauvegarder les TTL
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
                      Suppression...
                    </>
                  ) : (
                    "Vider le cache"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
