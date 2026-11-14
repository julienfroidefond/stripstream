"use client";

import type { MouseEvent } from "react";
import { BookCheck, BookX, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";
import { burst } from "@/lib/motion/celebrate";
import { cn } from "@/lib/utils";

interface BookReadButtonProps {
  onClick: () => void;
  /** Un marquage de ce livre est en vol. */
  pending: boolean;
  className?: string;
}

/**
 * Boutons de marquage lu / non lu d'une carte de livre.
 *
 * Purement présentationnels : l'action serveur, l'état optimiste, le toast, le
 * rollback et le refresh appartiennent à `useReadProgressMutations`. Le clic
 * ne remonte pas au lien de la carte.
 */
export function MarkAsReadButton({ onClick, pending, className }: BookReadButtonProps) {
  const { t } = useTranslate();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // Le marquage est optimiste : le bouton disparaît au rendu suivant, la
    // gerbe part donc maintenant, depuis sa position à l'écran.
    burst(event.currentTarget);
    onClick();
  };

  return (
    <Button
      data-testid="mark-as-read"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn("h-8 w-8 p-0 rounded-br-lg rounded-tl-lg", className)}
      disabled={pending}
      aria-label={t("books.actions.markAsRead.button")}
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookCheck className="h-5 w-5" />}
    </Button>
  );
}

export function MarkAsUnreadButton({ onClick, pending, className }: BookReadButtonProps) {
  const { t } = useTranslate();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick();
  };

  return (
    <Button
      data-testid="mark-as-unread"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={cn("h-8 w-8 p-0 rounded-br-lg rounded-tl-lg", className)}
      disabled={pending}
      aria-label={t("books.actions.markAsUnread.button")}
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookX className="h-5 w-5" />}
    </Button>
  );
}
