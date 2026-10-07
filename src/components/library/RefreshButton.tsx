"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useRefresh } from "@/contexts/RefreshContext";

interface RefreshButtonProps {
  libraryId: string;
  refreshLibrary?: (libraryId: string) => Promise<{ success: boolean; error?: string }>;
}

export function RefreshButton({ libraryId, refreshLibrary: refreshLibraryProp }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { refreshLibrary: refreshLibraryFromContext } = useRefresh();
  const refreshLibrary = refreshLibraryProp ?? refreshLibraryFromContext;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshLibrary) {
        const result = await refreshLibrary(libraryId);

        if (!result.success) {
          throw new Error(result.error);
        }
      } else {
        router.refresh();
      }

      toast({
        title: t("library.refresh.success.title"),
        description: t("library.refresh.success.description"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("library.refresh.error.title"),
        description:
          error instanceof Error ? error.message : t("library.refresh.error.description"),
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
      aria-label={t("library.refresh.button")}
      data-library-id={libraryId}
    >
      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
    </Button>
  );
}
