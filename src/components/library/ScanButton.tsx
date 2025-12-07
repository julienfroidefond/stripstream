"use client";

import { useState } from "react";
import { FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import logger from "@/lib/logger";

interface ScanButtonProps {
  libraryId: string;
}

export function ScanButton({ libraryId }: ScanButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`/api/komga/libraries/${libraryId}/scan`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to scan library");
      }

      toast({
        title: t("library.scan.success.title"),
        description: t("library.scan.success.description"),
      });

      // Attendre 5 secondes pour que le scan se termine, puis invalider le cache et rafraîchir
      setTimeout(async () => {
        try {
          // Invalider le cache
          await fetch(`/api/komga/libraries/${libraryId}/series`, {
            method: "DELETE",
          });

          // Rafraîchir la page pour voir les changements
          router.refresh();

          // Toast pour indiquer que l'analyse est terminée
          toast({
            title: t("library.scan.complete.title"),
            description: t("library.scan.complete.description"),
          });
        } catch (error) {
          logger.error({ err: error }, "Error invalidating cache after scan:");
          toast({
            variant: "destructive",
            title: t("library.scan.error.title"),
            description: t("library.scan.error.refresh"),
          });
        } finally {
          setIsScanning(false);
        }
      }, 5000);
    } catch (error) {
      setIsScanning(false);
      toast({
        variant: "destructive",
        title: t("library.scan.error.title"),
        description: error instanceof Error ? error.message : t("library.scan.error.description"),
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleScan}
      disabled={isScanning}
      className="ml-2"
      aria-label={t("library.scan.button")}
    >
      <FolderSearch className={cn("h-4 w-4", isScanning && "animate-pulse")} />
    </Button>
  );
}
