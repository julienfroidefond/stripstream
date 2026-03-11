"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Network, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import logger from "@/lib/logger";
import { saveStripstreamConfig, testStripstreamConnection } from "@/app/actions/stripstream-config";

interface StripstreamSettingsProps {
  initialUrl?: string;
  hasToken?: boolean;
}

export function StripstreamSettings({ initialUrl, hasToken }: StripstreamSettingsProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [token, setToken] = useState("");
  const [isEditing, setIsEditing] = useState(!initialUrl);

  const isConfigured = !!initialUrl;
  const shouldShowForm = !isConfigured || isEditing;

  const handleTest = async () => {
    if (!url) return;
    setIsLoading(true);
    try {
      const result = await testStripstreamConnection(url.trim(), token);
      if (!result.success) {
        throw new Error(result.message);
      }
      toast({ title: "Stripstream Librarian", description: result.message });
    } catch (error) {
      logger.error({ err: error }, "Erreur test Stripstream:");
      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Connexion échouée",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = await saveStripstreamConfig(url.trim(), token);
      if (!result.success) {
        throw new Error(result.message);
      }
      setIsEditing(false);
      setToken("");
      toast({ title: "Stripstream Librarian", description: result.message });
      window.location.reload();
    } catch (error) {
      logger.error({ err: error }, "Erreur sauvegarde Stripstream:");
      toast({
        variant: "destructive",
        title: "Erreur de sauvegarde",
        description: error instanceof Error ? error.message : "Erreur lors de la sauvegarde",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
  const btnSecondary =
    "flex-1 inline-flex items-center justify-center rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
  const btnPrimary =
    "flex-1 inline-flex items-center justify-center rounded-md bg-primary/90 backdrop-blur-md px-3 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          Stripstream Librarian
        </CardTitle>
        <CardDescription>
          Connectez votre instance Stripstream Librarian via token API (format{" "}
          <code className="text-xs">stl_...</code>).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!shouldShowForm ? (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL du serveur</label>
                <p className="text-sm text-muted-foreground">{url}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Token API</label>
                <p className="text-sm text-muted-foreground">{hasToken ? "••••••••" : "Non configuré"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center rounded-md bg-secondary/80 backdrop-blur-md px-3 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Modifier
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <label htmlFor="stripstream-url" className="text-sm font-medium">
                  URL du serveur
                </label>
                <input
                  type="url"
                  id="stripstream-url"
                  name="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://librarian.example.com"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="stripstream-token" className="text-sm font-medium">
                  Token API
                  {isConfigured && (
                    <span className="ml-2 text-xs text-muted-foreground">(laisser vide pour conserver l&apos;actuel)</span>
                  )}
                </label>
                <input
                  type="password"
                  id="stripstream-token"
                  name="token"
                  required={!isConfigured}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={isConfigured ? "••••••••" : "stl_xxxx_xxxxxxxx"}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSaving} className={btnPrimary}>
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
                disabled={isLoading || !url}
                className={btnSecondary}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test...
                  </>
                ) : (
                  "Tester"
                )}
              </button>
              {isConfigured && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setToken("");
                  }}
                  className={btnSecondary}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
