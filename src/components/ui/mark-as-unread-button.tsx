"use client";

import { XCircle } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./use-toast";

interface MarkAsUnreadButtonProps {
  bookId: string;
  isRead: boolean;
  onSuccess?: () => void;
  className?: string;
}

export function MarkAsUnreadButton({
  bookId,
  isRead = false,
  onSuccess,
  className,
}: MarkAsUnreadButtonProps) {
  const { toast } = useToast();

  const handleMarkAsUnread = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation au parent
    try {
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
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleMarkAsUnread}
      className={`h-8 w-8 p-0 rounded-br-lg rounded-tl-lg ${className}`}
      disabled={!isRead}
      aria-label="Marquer comme non lu"
    >
      <XCircle className="h-5 w-5" />
    </Button>
  );
}
