"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  libraryId: string;
  refreshLibrary: (libraryId: string) => Promise<{ success: boolean; error?: string }>;
}

export function RefreshButton({ libraryId, refreshLibrary }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshLibrary(libraryId);

      if (result.success) {
        toast({
          title: "Bibliothèque rafraîchie",
          description: "La bibliothèque a été rafraîchie avec succès",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="ml-2"
      aria-label="Rafraîchir la bibliothèque"
    >
      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
    </Button>
  );
}
