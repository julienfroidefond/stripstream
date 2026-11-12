"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRefreshSurface } from "@/contexts/RefreshContext";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  className?: string;
}

/**
 * Bouton générique d'une `RefreshSurface` : il ne connaît ni la bibliothèque,
 * ni la série, ni l'action serveur. Le contexte porte le scope, l'identifiant,
 * le pending et le cycle.
 */
export function RefreshButton({ className }: RefreshButtonProps) {
  const { scope, id, isRefreshing, refresh } = useRefreshSurface();
  const { toast } = useToast();
  const { t } = useTranslate();

  const handleRefresh = async () => {
    const result = await refresh();

    if (!result.success) {
      toast({
        variant: "destructive",
        title: t("refresh.error.title"),
        description: result.error ?? t("refresh.error.description"),
      });
      return;
    }

    toast({
      title: t("refresh.success.title"),
      description: t("refresh.success.description"),
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={cn("ml-2", className)}
      aria-label={t("refresh.button")}
      data-refresh-scope={scope}
      data-refresh-id={id}
    >
      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
    </Button>
  );
}
