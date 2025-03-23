"use client";

import { BookX, Loader2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./use-toast";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface MarkAsUnreadButtonProps {
  bookId: string;
  onSuccess?: () => void;
  className?: string;
}

export function MarkAsUnreadButton({ bookId, onSuccess, className }: MarkAsUnreadButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleMarkAsUnread = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation au parent
    setIsLoading(true);
    try {
      const response = await fetch(`/api/komga/books/${bookId}/read-progress`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(t("books.actions.markAsUnread.error.update"));
      }

      // On supprime la page courante du localStorage seulement après que l'API a répondu
      ClientOfflineBookService.removeCurrentPageById(bookId);

      toast({
        title: t("books.actions.markAsUnread.success.title"),
        description: t("books.actions.markAsUnread.success.description"),
      });
      onSuccess?.();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du progresseur de lecture:", error);
      toast({
        title: t("books.actions.markAsUnread.error.title"),
        description: t("books.actions.markAsUnread.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleMarkAsUnread}
      className={`h-8 w-8 p-0 rounded-br-lg rounded-tl-lg ${className}`}
      disabled={isLoading}
      aria-label={t("books.actions.markAsUnread.button")}
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookX className="h-5 w-5" />}
    </Button>
  );
}
