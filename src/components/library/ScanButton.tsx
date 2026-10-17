"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FolderSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import logger from "@/lib/logger";
import { getScanStatus, scanLibrary } from "@/app/actions/library";

interface ScanButtonProps {
  libraryId: string;
  className?: string;
}

// The scan runs in the background on the provider: poll at a human pace while
// keeping a hard ceiling so a stuck job cannot poll forever.
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_DURATION_MS = 10 * 60 * 1000;
const MAX_CONSECUTIVE_UNAVAILABLE = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ScanButton({ libraryId, className }: ScanButtonProps) {
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  // Set to false on unmount so a long scan does not toast after navigation.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const followScan = useCallback(
    async (jobId: string) => {
      const startedAt = Date.now();
      let unavailableCount = 0;

      while (mountedRef.current && Date.now() - startedAt < MAX_POLL_DURATION_MS) {
        await sleep(POLL_INTERVAL_MS);
        if (!mountedRef.current) return;

        const status = await getScanStatus(libraryId, jobId);
        if (!mountedRef.current) return;

        if (status.state === "unavailable") {
          unavailableCount += 1;
          if (unavailableCount >= MAX_CONSECUTIVE_UNAVAILABLE) {
            toast({
              title: t("library.scan.tracking.lost.title"),
              description: t("library.scan.tracking.lost.description"),
            });
            router.refresh();
            return;
          }
          continue;
        }

        unavailableCount = 0;

        if (status.state === "running") continue;

        if (status.state === "completed") {
          // The list refreshes at the actual end of the scan, not on a timer.
          router.refresh();
          toast({
            title: t("library.scan.complete.title"),
            description: t("library.scan.complete.description"),
          });
          return;
        }

        if (status.state === "cancelled") {
          toast({
            title: t("library.scan.cancelled.title"),
            description: t("library.scan.cancelled.description"),
          });
          return;
        }

        router.refresh();
        toast({
          variant: "destructive",
          title: t("library.scan.error.title"),
          description: status.error || t("library.scan.error.description"),
        });
        return;
      }

      if (mountedRef.current) {
        toast({
          title: t("library.scan.tracking.timeout.title"),
          description: t("library.scan.tracking.timeout.description"),
        });
        router.refresh();
      }
    },
    [libraryId, router, t, toast]
  );

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const result = await scanLibrary(libraryId);

      if (!result.success) {
        toast({
          variant: "destructive",
          title: t("library.scan.error.title"),
          description: result.forbidden
            ? t("library.scan.error.forbidden")
            : result.message || t("library.scan.error.description"),
        });
        return;
      }

      toast({
        title: t("library.scan.success.title"),
        description: result.progressSupported
          ? t("library.scan.success.description")
          : t("library.scan.tracking.unavailable"),
      });

      if (result.progressSupported && result.jobId) {
        await followScan(result.jobId);
      } else {
        // No progress endpoint: refresh once so the view is current, then let
        // the user refresh when the backend has actually finished.
        router.refresh();
      }
    } catch (error) {
      logger.error({ err: error }, "Error while scanning library");
      toast({
        variant: "destructive",
        title: t("library.scan.error.title"),
        description: error instanceof Error ? error.message : t("library.scan.error.description"),
      });
    } finally {
      if (mountedRef.current) setIsScanning(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleScan}
      disabled={isScanning}
      aria-label={t("library.scan.button")}
      aria-busy={isScanning}
      data-testid="library-scan"
      className={cn("ml-2", className)}
    >
      <FolderSearch className={cn("h-4 w-4", isScanning && "animate-pulse")} />{/* taste-skill-ignore: indicateur de scan en cours */}
    </Button>
  );
}
