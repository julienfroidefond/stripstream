"use client";

import { gsap, prefersReducedMotion } from "@/lib/gsap";

/**
 * Petits gestes de retour sur une action (favori, lu, note, téléchargement).
 *
 * Impératifs et sans état : on les appelle depuis un gestionnaire de clic,
 * sur l'élément cliqué. Rien n'est joué sous `prefers-reduced-motion`.
 */

/** L'élément grossit d'un coup puis se pose avec un rebond. */
export function pop(element: Element | null | undefined, scale = 1.35): void {
  if (!element || prefersReducedMotion()) return;
  gsap.fromTo(
    element,
    { scale },
    { scale: 1, duration: 0.55, ease: "back.out(3)", overwrite: "auto", clearProps: "scale" }
  );
}

/** Refus ou retour en arrière : l'élément secoue la tête. */
export function nudge(element: Element | null | undefined): void {
  if (!element || prefersReducedMotion()) return;
  gsap.fromTo(
    element,
    { rotate: 0 },
    {
      keyframes: { rotate: [0, -16, 12, -6, 0] },
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
      clearProps: "rotate",
    }
  );
}

/** Saisie refusée : l'élément secoue la tête de gauche à droite. */
export function shake(element: Element | null | undefined): void {
  if (!element || prefersReducedMotion()) return;
  gsap.fromTo(
    element,
    { x: 0 },
    {
      keyframes: { x: [0, -10, 9, -6, 4, 0] },
      duration: 0.45,
      ease: "power2.out",
      overwrite: "auto",
      clearProps: "transform",
    }
  );
}

/** Téléchargement : la flèche tombe, puis revient d'en haut. */
export function drop(element: Element | null | undefined): void {
  if (!element || prefersReducedMotion()) return;
  gsap
    .timeline({ onComplete: () => gsap.set(element, { clearProps: "transform,opacity" }) })
    .to(element, { y: 10, opacity: 0, duration: 0.18, ease: "power2.in" })
    .set(element, { y: -10 })
    .to(element, { y: 0, opacity: 1, duration: 0.45, ease: "back.out(2.6)" });
}

interface BurstOptions {
  /** Couleur des particules (toute valeur CSS). */
  color?: string;
  count?: number;
  /** Rayon moyen de la gerbe, en pixels. */
  distance?: number;
}

/**
 * Une gerbe de particules part du centre de `origin`. Les particules vivent
 * dans `document.body`, en `position: fixed`, pour ne pas être coupées par un
 * `overflow: hidden` ; elles sont retirées à la fin.
 */
export function burst(
  origin: Element | null | undefined,
  { color = "hsl(var(--primary))", count = 10, distance = 34 }: BurstOptions = {}
): void {
  if (!origin || prefersReducedMotion()) return;
  const rect = origin.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement("span");
    particle.setAttribute("aria-hidden", "true");
    const size = 4 + Math.random() * 4;
    Object.assign(particle.style, {
      position: "fixed",
      left: `${centerX}px`,
      top: `${centerY}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "9999px",
      background: color,
      pointerEvents: "none",
      zIndex: "100",
    });
    document.body.appendChild(particle);

    const angle = (index / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
    const reach = distance * (0.7 + Math.random() * 0.5);
    gsap
      .timeline({ onComplete: () => particle.remove() })
      .fromTo(
        particle,
        { x: 0, y: 0, xPercent: -50, yPercent: -50, scale: 0 },
        {
          x: Math.cos(angle) * reach,
          y: Math.sin(angle) * reach,
          scale: 1,
          duration: 0.45,
          ease: "power3.out",
        }
      )
      .to(particle, { opacity: 0, scale: 0.3, duration: 0.25, ease: "power1.in" }, 0.3);
  }
}
