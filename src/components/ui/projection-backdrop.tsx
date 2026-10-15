"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/motion";

/** Voile de papier : en clair, le bandeau se fond dans la page. */
const SCRIM =
  "bg-linear-to-t from-background via-background/40 to-transparent dark:from-black/70 dark:via-black/30 dark:to-black/5"; // taste-skill-ignore: scrim neutre au-dessus de la couverture

const IMAGE =
  "brightness-[1.05] saturate-[1.25] dark:brightness-[0.88] dark:saturate-[1.25]";

interface ProjectionBackdropProps {
  /** Couverture servant de source de lumière. */
  src: string;
  /**
   * Le fond porte déjà son propre fondu d'apparition (carrousels de l'accueil).
   * Le passer à `false` quand l'appelant gère le fondu.
   */
  fadeIn?: boolean;
  className?: string;
}

/**
 * Fond d'affiche — la couverture, très floutée, éclaire la scène.
 *
 * Un travelling lent garde la salle vivante : translation et zoom sur deux
 * éléments imbriqués, chacun sa durée. Il est écrit en CSS (classes
 * `animate-backdrop-pan` / `animate-backdrop-zoom`) et non en JS : une boucle
 * infinie n'a ainsi rien à monter, elle démarre dès que la classe est posée et
 * se tient sur le compositeur. Les voiles garantissent ensuite le contraste du
 * texte. Le fond suit le thème : lavis de papier en clair, salle noire en
 * sombre. Le mouvement est intégralement coupé sous `prefers-reduced-motion`.
 */
export function ProjectionBackdrop({ src, fadeIn = true, className }: ProjectionBackdropProps) {
  const reduce = useReducedMotion();
  const drift = !reduce;

  return (
    <div className={cn("grain absolute inset-0 overflow-hidden [contain:paint]", className)}>
      {/* Seul le fondu passe par framer : le travelling, lui, ne dépend d'aucun montage. */}
      <motion.div
        className="absolute -inset-[8%]"
        initial={fadeIn && drift ? { opacity: 0 } : undefined}
        animate={{ opacity: 1 }}
        transition={drift ? { duration: 1.1, ease: EASE_OUT } : { duration: 0 }}
      >
        <div className={cn("h-full w-full", drift && "animate-backdrop-pan motion-reduce:animate-none")}>
          <div className={cn("h-full w-full", drift ? "animate-backdrop-zoom motion-reduce:animate-none" : "scale-[1.12]")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              aria-hidden="true"
              className={cn("h-full w-full object-cover object-top blur-[14px]", IMAGE)}
            />
          </div>
        </div>
      </motion.div>

      {/* Voiles neutres : contraste du texte, puis vignette de salle. */}
      <div className="absolute inset-0 bg-background/55 dark:bg-black/25" />
      <div className="projection-vignette-paper dark:projection-vignette absolute inset-0" />
      <div className={cn("absolute inset-0", SCRIM)} />
    </div>
  );
}
