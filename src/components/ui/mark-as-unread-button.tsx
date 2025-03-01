"use client";

import { BookX, Loader2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./use-toast";
import { ClientOfflineBookService } from "@/lib/services/client-offlinebook.service";
import { useState } from "react";

interface MarkAsUnreadButtonProps {
  bookId: string;
  onSuccess?: () => void;
  className?: string;
}

export function MarkAsUnreadButton({ bookId, onSuccess, className }: MarkAsUnreadButtonProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAsUnread = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation au parent
    setIsLoading(true);
    try {
      ClientOfflineBookService.removeCurrentPageById(bookId);
      const response = await fetch(`/api/komga/books/${bookId}/read-progress`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      toast({
        title: "Succès",
        description: "Le tome a été marqué comme non lu",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du progresseur de lecture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer le tome comme non lu",
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
      aria-label="Marquer comme non lu"
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookX className="h-5 w-5" />}
    </Button>
  );
}
