"use client";

import { BookCheck, Loader2 } from "lucide-react";
import { Button } from "./button";
import { burst, pop } from "@/lib/celebrate";
import { useToast } from "./use-toast";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import logger from "@/lib/logger";
import { updateReadProgress } from "@/app/actions/read-progress";

interface MarkAsReadButtonProps {
  bookId: string;
  pagesCount: number;
  isRead?: boolean;
  onSuccess?: () => void;
  className?: string;
}

export function MarkAsReadButton({
  bookId,
  pagesCount,
  isRead = false,
  onSuccess,
  className,
}: MarkAsReadButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation au parent
    const button = e.currentTarget;
    let succeeded = false;
    setIsLoading(true);
    try {
      const result = await updateReadProgress(bookId, pagesCount, true);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast({
        title: t("books.actions.markAsRead.success.title"),
        description: t("books.actions.markAsRead.success.description"),
      });
      succeeded = true;
      onSuccess?.();
    } catch (error) {
      logger.error({ err: error }, "Erreur lors de la mise à jour du progresseur de lecture:");
      toast({
        title: t("books.actions.markAsRead.error.title"),
        description: t("books.actions.markAsRead.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // L'icône revient à la place du spinner au rendu suivant : on l'anime après.
      if (succeeded) {
        requestAnimationFrame(() => {
          pop(button.querySelector("svg"), 1.5);
          burst(button);
        });
      }
    }
  };

  return (
    <Button
      data-testid="mark-as-read"
      variant="ghost"
      size="icon"
      onClick={handleMarkAsRead}
      className={`h-8 w-8 p-0 rounded-br-lg rounded-tl-lg ${className}`}
      disabled={isRead || isLoading}
      aria-label={t("books.actions.markAsRead.button")}
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookCheck className="h-5 w-5" />}
    </Button>
  );
}
