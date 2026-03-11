"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { setActiveProvider } from "@/app/actions/stripstream-config";
import type { ProviderType } from "@/lib/providers/types";

interface ProviderSelectorProps {
  activeProvider: ProviderType;
  komgaConfigured: boolean;
  stripstreamConfigured: boolean;
}

const providers: { id: ProviderType; label: string; description: string }[] = [
  {
    id: "komga",
    label: "Komga",
    description: "Serveur de gestion de BD / manga (Basic Auth)",
  },
  {
    id: "stripstream",
    label: "Stripstream Librarian",
    description: "Serveur de gestion de BD / manga (Bearer Token)",
  },
];

export function ProviderSelector({
  activeProvider,
  komgaConfigured,
  stripstreamConfigured,
}: ProviderSelectorProps) {
  const { toast } = useToast();
  const [current, setCurrent] = useState<ProviderType>(activeProvider);
  const [isChanging, setIsChanging] = useState(false);

  const isConfigured = (id: ProviderType) =>
    id === "komga" ? komgaConfigured : stripstreamConfigured;

  const handleSelect = async (provider: ProviderType) => {
    if (provider === current) return;
    setIsChanging(true);
    try {
      const result = await setActiveProvider(provider);
      if (!result.success) {
        throw new Error(result.message);
      }
      setCurrent(provider);
      toast({ title: "Provider actif", description: result.message });
      window.location.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Changement de provider échoué",
      });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider actif</CardTitle>
        <CardDescription>
          Choisissez le serveur que l&apos;application doit utiliser. Les deux configurations peuvent coexister.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((provider) => {
            const active = current === provider.id;
            const configured = isConfigured(provider.id);
            return (
              <button
                key={provider.id}
                type="button"
                disabled={isChanging || !configured}
                onClick={() => handleSelect(provider.id)}
                className={cn(
                  "relative flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                  (!configured || isChanging) && "cursor-not-allowed opacity-60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{provider.label}</span>
                  {active ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{provider.description}</p>
                {configured ? (
                  <span className="text-xs text-green-600 dark:text-green-400">✓ Configuré</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Non configuré</span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
