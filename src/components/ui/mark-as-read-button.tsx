"use client";

import { CheckCircle2 } from "lucide-react";
import { Button } from "./button";
import { useToast } from "./use-toast";

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

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation au parent
    try {
      const response = await fetch(`/api/komga/books/${bookId}/read-progress`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ page: pagesCount, completed: true }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }

      toast({
        title: "Succès",
        description: "Le tome a été marqué comme lu",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du progresseur de lecture:", error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer le tome comme lu",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleMarkAsRead}
      className={`h-8 w-8 p-0 rounded-br-lg rounded-tl-lg ${className}`}
      disabled={isRead}
      aria-label="Marquer comme lu"
    >
      <CheckCircle2 className="h-5 w-5" />
    </Button>
  );
}
