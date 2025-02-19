"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { usePreferences } from "@/contexts/PreferencesContext";

export function CacheModeSwitch() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { preferences, updatePreferences } = usePreferences();

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      // Mettre à jour les préférences
      await updatePreferences({ cacheMode: checked ? "memory" : "file" });

      // Mettre à jour le mode de cache côté serveur
      const res = await fetch("/api/komga/cache/mode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: checked ? "memory" : "file" }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Mode de cache modifié",
        description: `Le cache est maintenant en mode ${checked ? "mémoire" : "fichier"}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de modifier le mode de cache",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="cache-mode"
        checked={preferences.cacheMode === "memory"}
        onCheckedChange={handleToggle}
        disabled={isLoading}
      />
      <Label htmlFor="cache-mode" className="text-sm text-muted-foreground">
        Cache en mémoire {isLoading && "(chargement...)"}
      </Label>
    </div>
  );
}
