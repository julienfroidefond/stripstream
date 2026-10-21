import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface WallFrameProps {
  children: ReactNode;
  className?: string;
}

/**
 * Cadre plein écran du Wall.
 *
 * Le mur occupe exactement la hauteur laissée par l'en-tête. `main` ajoute un
 * `pt-safe` (encoche iOS) : on l'annule ici pour que le cadre se cale sous la
 * barre, sans laisser de bande morte ni déborder en bas. `overflow-hidden`
 * appartient au mur : le déplacement se fait dans le repère, pas dans la page.
 */
export function WallFrame({ children, className }: WallFrameProps) {
  return (
    <section
      className={cn(
        "grain relative isolate w-full overflow-hidden bg-background text-foreground",
        className
      )}
      style={{
        marginTop: "calc(-1 * env(safe-area-inset-top, 0px))",
        height: "calc(100dvh - 4rem - env(safe-area-inset-top, 0px))",
      }}
    >
      {children}
    </section>
  );
}
