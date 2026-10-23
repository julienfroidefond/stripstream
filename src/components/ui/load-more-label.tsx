"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { gsap, prefersReducedMotion, useGsapEffect } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface LoadMoreLabelProps {
  pending: boolean;
  /** Libellé au repos (« Voir plus »). */
  label: string;
  /** Annonce lue par les lecteurs d'écran pendant le chargement. */
  loadingLabel: string;
  className?: string;
}

/**
 * Libellé de « Voir plus » : pendant le chargement, le texte sort par le haut
 * et un anneau entre en rebondissant puis tourne, sa trace qui respire. Au
 * retour, l'anneau sort en pivotant et le texte retombe en place.
 *
 * Les deux états occupent la même cellule de grille : le bouton garde sa
 * largeur, rien ne bouge autour. Seuls les changements d'état animent ; le
 * premier rendu pose l'état directement.
 */
export function LoadMoreLabel({ pending, label, loadingLabel, className }: LoadMoreLabelProps) {
  const reduce = usePrefersReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);
  const spinRef = useRef<SVGSVGElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const previous = useRef(pending);

  useGsapEffect(
    () => {
      const text = labelRef.current;
      const icon = iconRef.current;
      const spin = spinRef.current;
      const arc = arcRef.current;
      if (!text || !icon || !spin || !arc) return;

      const changed = previous.current !== pending;
      previous.current = pending;

      if (!changed || reduce || prefersReducedMotion()) {
        gsap.set(text, { opacity: pending ? 0 : 1, yPercent: 0 });
        gsap.set(icon, { autoAlpha: pending ? 1 : 0, scale: 1, rotate: 0 });
        if (!pending || reduce || prefersReducedMotion()) return;
      }

      const loops: gsap.core.Tween[] = [];
      const timeline = gsap.timeline();

      if (pending) {
        if (changed) {
          timeline
            .to(text, { yPercent: -70, opacity: 0, duration: 0.2, ease: "power2.in" }, 0)
            .fromTo(
              icon,
              { autoAlpha: 0, scale: 0.3, rotate: -140 },
              { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2.4)" },
              0.1
            );
        }
        loops.push(
          gsap.to(spin, {
            rotate: "+=360",
            transformOrigin: "50% 50%",
            duration: 0.85,
            ease: "none",
            repeat: -1,
          }),
          gsap.fromTo(
            arc,
            { strokeDasharray: "6 51" },
            { strokeDasharray: "34 23", duration: 0.7, ease: "sine.inOut", repeat: -1, yoyo: true }
          )
        );
      } else {
        timeline
          .to(icon, { autoAlpha: 0, scale: 0.3, rotate: 160, duration: 0.25, ease: "power2.in" }, 0)
          .fromTo(
            text,
            { yPercent: 70, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.45, ease: "back.out(1.8)" },
            0.12
          );
      }

      return () => {
        timeline.kill();
        loops.forEach((loop) => loop.kill());
      };
    },
    { dependencies: [pending, reduce] }
  );

  return (
    <span
      ref={rootRef}
      className={cn("inline-grid place-items-center overflow-hidden", className)}
    >
      <span ref={labelRef} className="[grid-area:1/1]" aria-hidden={pending}>
        {label}
      </span>
      <span
        ref={iconRef}
        aria-hidden
        className={cn("[grid-area:1/1] text-primary", !pending && "invisible opacity-0")}
      >
        <svg ref={spinRef} viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
          <circle
            ref={arcRef}
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="14 43"
          />
        </svg>
      </span>
      {pending && <span className="sr-only">{loadingLabel}</span>}
    </span>
  );
}
