"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./button";
import { useToast } from "./use-toast";
import { canShareFiles, fetchSharedFile, isIosStandalone } from "@/lib/download";
import { cn } from "@/lib/utils";
import { drop } from "@/lib/celebrate";
import logger from "@/lib/logger";

interface DownloadBookButtonProps {
  /** URL proxy locale qui streame le fichier source original du tome. */
  url?: string | null;
  /** Nom de repli quand le serveur n'envoie pas de `Content-Disposition`. */
  filename?: string;
  className?: string;
}

/**
 * Téléchargement du fichier source d'un tome.
 *
 * - Navigateur classique (desktop, Android, Safari iOS hors PWA) : un simple
 *   lien `download` ; le nom vient du `Content-Disposition` renvoyé par le proxy.
 * - Web app iOS installée : le lien seul bloque la web view (bug WebKit), donc
 *   on récupère le fichier et on le passe à la feuille de partage native.
 */
export function DownloadBookButton({ url, filename, className }: DownloadBookButtonProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isPreparing, setIsPreparing] = useState(false);

  if (!url) return null;

  const handleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    drop(event.currentTarget.querySelector("svg"));

    if (!isIosStandalone()) return;
    event.preventDefault();
    if (isPreparing) return;

    setIsPreparing(true);
    try {
      toast({ title: t("books.actions.download.preparing") });
      const file = await fetchSharedFile(url, filename);
      if (canShareFiles(file)) {
        await navigator.share({ files: [file] });
        return;
      }
      window.open(url, "_blank", "noopener");
    } catch (error) {
      // Feuille de partage fermée par l'utilisateur : rien d'autre à faire.
      if ((error as DOMException | undefined)?.name === "AbortError") return;
      logger.error({ err: error }, "Téléchargement du fichier du tome échoué");
      toast({
        title: t("books.actions.download.error.title"),
        description: t("books.actions.download.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <Button asChild variant="ghost" size="icon" className={cn("h-8 w-8 p-0", className)}>
      <a
        href={url}
        download
        onClick={handleClick}
        data-testid="download-book"
        aria-label={t("books.actions.download.button")}
        title={t("books.actions.download.button")}
      >
        {isPreparing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Download className="h-5 w-5" />
        )}
      </a>
    </Button>
  );
}
