"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { storageService } from "@/lib/services/storage.service";
import { AuthError } from "@/types/auth";

export default function SettingsPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [success, setSuccess] = useState(false);
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

  const handleTest = async () => {
    if (!formRef.current) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(formRef.current);
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
          password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          `${data.error}${
            data.details ? `\n\nDétails: ${JSON.stringify(data.details, null, 2)}` : ""
          }`
        );
      }

      setSuccess(true);
    } catch (error) {
      console.error("Erreur de test:", error);
      setError({
        code: "INVALID_SERVER_URL",
        message:
          error instanceof Error ? error.message : "Impossible de se connecter au serveur Komga",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(false);

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
    setSuccess(true);
  };

  return (
    <div className="container max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Préférences</h1>
          <p className="text-muted-foreground mt-2">Configurez votre connexion au serveur Komga</p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Configuration du serveur Komga</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ces identifiants sont différents de ceux utilisés pour vous connecter à l'application.
            Il s'agit des identifiants de votre serveur Komga.
          </p>

          <form ref={formRef} className="space-y-8" onSubmit={handleSave}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="serverUrl"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  URL du serveur Komga
                </label>
                <input
                  id="serverUrl"
                  name="serverUrl"
                  type="url"
                  placeholder="https://komga.example.com"
                  defaultValue={config.serverUrl || process.env.NEXT_PUBLIC_DEFAULT_KOMGA_URL}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-sm text-muted-foreground">
                  L'URL complète de votre serveur Komga, par exemple: https://komga.example.com
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Identifiant Komga
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  defaultValue={config.username}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-sm text-muted-foreground">
                  L'identifiant de votre compte sur le serveur Komga
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Mot de passe Komga
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  defaultValue={config.password}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-sm text-muted-foreground">
                  Le mot de passe de votre compte sur le serveur Komga
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error.message}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-500">
                {isLoading ? "Test de connexion réussi" : "Configuration sauvegardée"}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleTest}
                className="flex-1 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? "Test en cours..." : "Tester la connexion"}
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
