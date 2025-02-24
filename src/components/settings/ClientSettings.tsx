"use client";

import { useState } from "react";
import { Loader2, Network, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthError } from "@/types/auth";
import { useToast } from "@/components/ui/use-toast";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CacheModeSwitch } from "@/components/settings/CacheModeSwitch";

interface KomgaConfig {
  url: string;
  username: string;
  userId: string;
  password?: string;
  authHeader: string;
}

interface TTLConfigData {
  defaultTTL: number;
  homeTTL: number;
  librariesTTL: number;
  seriesTTL: number;
  booksTTL: number;
  imagesTTL: number;
}

interface ClientSettingsProps {
  initialConfig: KomgaConfig | null;
  initialTTLConfig: TTLConfigData | null;
}

export function ClientSettings({ initialConfig, initialTTLConfig }: ClientSettingsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCacheClearing, setIsCacheClearing] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState({
    serverUrl: initialConfig?.url || "",
    username: initialConfig?.username || "",
    password: initialConfig?.password || "",
    authHeader: initialConfig?.authHeader || "",
  });
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [localInitialConfig, setLocalInitialConfig] = useState(initialConfig);
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
  const { preferences, updatePreferences } = usePreferences();

  const hasToShowEditForm =
    localInitialConfig && config.serverUrl !== null && config.username !== null;
  const shouldShowForm = !hasToShowEditForm || isEditingConfig;

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

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);
    setError(null);
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
        throw new Error(data.error || "Erreur lors de la sauvegarde de la configuration");
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
        title: "Configuration sauvegardée",
        description: "La configuration a été sauvegardée avec succès",
      });

      // Forcer un rechargement complet de la page
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Une erreur est survenue lors de la sauvegarde",
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

  const handleTTLChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setTTLConfig((prev) => ({
      ...prev,
      [name]: parseInt(value || "0", 10),
    }));
  };

  const handleSaveTTL = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess(null);

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
        throw new Error(data.error || "Erreur lors de la sauvegarde de la configuration TTL");
      }

      toast({
        title: "Configuration TTL sauvegardée",
        description: "La configuration des TTL a été sauvegardée avec succès",
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Une erreur est survenue lors de la sauvegarde",
      });
    }
  };

  const handleToggleThumbnails = async (checked: boolean) => {
    try {
      await updatePreferences({ showThumbnails: checked });
      toast({
        title: "Préférences sauvegardées",
        description: "Les préférences ont été mises à jour avec succès",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          error instanceof Error
            ? error.message
            : "Une erreur est survenue lors de la mise à jour des préférences",
      });
    }
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
        {/* Section Préférences d'affichage */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Préférences d'affichage
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Personnalisez l'affichage de votre bibliothèque.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="thumbnails">Afficher les vignettes</Label>
                  <p className="text-sm text-muted-foreground">
                    Utiliser les vignettes au lieu des premières pages pour l'affichage des séries
                  </p>
                </div>
                <Switch
                  id="thumbnails"
                  checked={preferences.showThumbnails}
                  onCheckedChange={handleToggleThumbnails}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="unread-filter">Filtre "À lire" par défaut</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher uniquement les séries non lues par défaut
                  </p>
                </div>
                <Switch
                  id="unread-filter"
                  checked={preferences.showOnlyUnread}
                  onCheckedChange={async (checked) => {
                    try {
                      await updatePreferences({ showOnlyUnread: checked });
                      toast({
                        title: "Préférences sauvegardées",
                        description: `Le filtre "À lire" par défaut est maintenant ${
                          checked ? "activé" : "désactivé"
                        }`,
                      });
                    } catch (error) {
                      console.error("Erreur détaillée:", error);
                      toast({
                        variant: "destructive",
                        title: "Erreur",
                        description:
                          error instanceof Error
                            ? error.message
                            : "Une erreur est survenue lors de la mise à jour des préférences",
                      });
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="debug-mode">Mode debug</Label>
                  <p className="text-sm text-muted-foreground">
                    Afficher les informations de debug dans l'interface
                  </p>
                </div>
                <Switch
                  id="debug-mode"
                  checked={preferences.debug}
                  onCheckedChange={async (checked) => {
                    try {
                      await updatePreferences({ debug: checked });
                      toast({
                        title: "Préférences sauvegardées",
                        description: `Le mode debug est maintenant ${
                          checked ? "activé" : "désactivé"
                        }`,
                      });
                    } catch (error) {
                      console.error("Erreur détaillée:", error);
                      toast({
                        variant: "destructive",
                        title: "Erreur",
                        description:
                          error instanceof Error
                            ? error.message
                            : "Une erreur est survenue lors de la mise à jour des préférences",
                      });
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

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

            {!shouldShowForm ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">L&apos;URL du serveur</label>
                    <p className="text-sm text-muted-foreground">{config.serverUrl}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">L&apos;adresse email de connexion</label>
                    <p className="text-sm text-muted-foreground">{config.username}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mot de passe</label>
                    <p className="text-sm text-muted-foreground">••••••••</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingConfig(true)}
                  className="inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  Modifier la configuration
                </button>
              </div>
            ) : (
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
                    disabled={isSaving}
                    className="flex-1 inline-flex items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      "Sauvegarder"
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
                        Test en cours...
                      </>
                    ) : (
                      "Tester la connexion"
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
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            )}
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

            <div className="flex items-center justify-between mb-4">
              <div className="space-y-0.5">
                <Label htmlFor="cache-mode">Mode de cache</Label>
                <p className="text-sm text-muted-foreground">
                  Le cache en mémoire est plus rapide mais ne persiste pas entre les redémarrages
                </p>
              </div>
              <CacheModeSwitch />
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
