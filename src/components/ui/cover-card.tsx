"use client";

import Link from "next/link";
import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { BookCoverScene } from "@/components/ui/book-cover-scene";
import { useCoverInteraction } from "@/hooks/useCoverInteraction";
import { GlowLayer, usePointerGlow } from "@/components/motion";
import { cn } from "@/lib/utils";

const COVER_RADIUS = "rounded-[2px_6px_6px_2px]";

/** Liseré discret qui garde la couverture lisible sur les fonds clairs. */
export function CoverEdge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-20 ring-1 ring-inset ring-border/60",
        COVER_RADIUS,
        className
      )}
    />
  );
}

interface CoverCardProps {
  href: string;
  ariaLabel: string;
  /** Image et éventuels overlays internes de la couverture. */
  cover: ReactNode;
  badge?: ReactNode;
  /** Actions hors du lien (téléchargement, marquer comme lu…). */
  overlay?: ReactNode;
  /** Légende sous la couverture : titre, statut, nombre de tomes… */
  children: ReactNode;
  className?: string;
  captionClassName?: string;
  onNavigate?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Carte de couverture 3D partagée par les grilles et les rails.
 *
 * Le lien englobe la couverture et sa légende pour n'avoir qu'un seul arrêt
 * clavier, tandis que les actions restent dans `overlay`, hors du lien.
 */
export function CoverCard({
  href,
  ariaLabel,
  cover,
  badge,
  overlay,
  children,
  className,
  captionClassName,
  onNavigate,
}: CoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const handleGlow = usePointerGlow(cardRef);
  const { active, handlers } = useCoverInteraction<HTMLAnchorElement>();

  return (
    <div
      ref={cardRef}
      onMouseMove={handleGlow}
      className={cn(
        "group relative isolate h-full transition-none hover:z-30 focus-within:z-30",
        className
      )}
    >
      <Link
        href={href}
        aria-label={ariaLabel}
        onClick={onNavigate}
        {...handlers}
        className="flex h-full flex-col gap-2 rounded-xl focus-visible:outline-hidden"
      >
        <div className="relative">
          <BookCoverScene
            active={active}
            contained
            className="w-full"
            cover={cover}
            badge={badge}
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 z-30 opacity-0 ring-2 ring-ring ring-offset-2 ring-offset-background transition-opacity duration-150 group-focus-within:opacity-100",
              COVER_RADIUS
            )}
          />
        </div>

        <div className={cn("min-w-0 space-y-1 px-0.5", captionClassName)}>
          {children}
        </div>
      </Link>

      <GlowLayer />
      {overlay}
    </div>
  );
}
