"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Network, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { storageService } from "@/lib/services/storage.service";
import { AuthError } from "@/types/auth";

interface ErrorMessage {
  message: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCacheClearing, setIsCacheClearing] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState({
    serverUrl: "",
    username: "",
    password: "",
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

      setSuccess("Cache serveur supprimé avec succès");
      router.refresh(); // Rafraîchir la page pour recharger les données
    } catch (error) {
      console.error("Erreur:", error);
      setError({
        code: "CACHE_CLEAR_ERROR",
        message: error instanceof Error ? error.message : "Une erreur est survenue",
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

      setSuccess("Connexion réussie");
    } catch (error) {
      console.error("Erreur:", error);
      setError({
        code: "TEST_CONNECTION_ERROR",
        message: error instanceof Error ? error.message : "Une erreur est survenue",
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

    storageService.setCredentials(
      {
        serverUrl: newConfig.serverUrl,
        credentials: { username: newConfig.username, password: newConfig.password },
      },
      true
    );

    setConfig(newConfig);
    setSuccess("Configuration sauvegardée avec succès");
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Préférences</h1>
      </div>

      <div className="space-y-6">
        {/* Section Configuration Komga */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Configuration Komga</h2>
            <p className="text-sm text-muted-foreground">
              Configurez les informations de connexion à votre serveur Komga. Ces informations sont
              nécessaires pour accéder à votre bibliothèque.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Formulaire de configuration */}
            <div className="space-y-4">
              <form ref={formRef} onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="serverUrl" className="text-sm font-medium">
                    URL du serveur
                  </label>
                  <p className="text-xs text-muted-foreground">
                    L'adresse de votre serveur Komga, par exemple : https://komga.votredomaine.com
                  </p>
                  <input
                    type="url"
                    id="serverUrl"
                    name="serverUrl"
                    required
                    defaultValue={config.serverUrl}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium">
                    Nom d'utilisateur
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Votre identifiant de connexion au serveur Komga
                  </p>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    defaultValue={config.username}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Mot de passe
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Votre mot de passe de connexion au serveur Komga
                  </p>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    defaultValue={config.password}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  Sauvegarder
                </button>
              </form>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Actions</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Outils de gestion de la connexion et du cache
                </p>
                <div className="space-y-4">
                  <div>
                    <button
                      onClick={handleTest}
                      disabled={isLoading}
                      className="w-full inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vérifie que la connexion au serveur est fonctionnelle avec les paramètres
                      actuels
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={handleClearCache}
                      disabled={isCacheClearing}
                      className="w-full inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground ring-offset-background transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {isCacheClearing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Suppression...
                        </>
                      ) : (
                        "Supprimer le cache serveur"
                      )}
                    </button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vide le cache du serveur pour forcer le rechargement des données. Utile en cas
                      de problème d'affichage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
      </div>
    </div>
  );
}
