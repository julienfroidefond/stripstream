"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Socle GSAP du langage « projection ».
 *
 * Les courbes nommées, partagées par toutes les animations du site :
 *  - `projection` : cubic-bezier(0.22, 1, 0.36, 1), la courbe signature (aussi
 *                   exposée en CSS : `--ease-projection`) ;
 *  - `out`        : cubic-bezier(0.16, 1, 0.3, 1), les micro-interactions ;
 *  - `focus`      : léger dépassement, comme un projecteur qui corrige son
 *                   cadrage.
 *
 * L'enregistrement est fait au chargement du module côté navigateur : le
 * serveur n'a pas de DOM et n'exécute aucune animation, mais les constantes de
 * easing restent de simples chaînes, donc le rendu SSR ne dépend pas de GSAP.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText, useGSAP);

  CustomEase.create("projection", "M0,0 C0.22,1 0.36,1 1,1");
  CustomEase.create("out", "M0,0 C0.16,1 0.3,1 1,1");
  CustomEase.create("focus", "M0,0 C0.18,1.075 0.32,1 1,1");

  gsap.defaults({ ease: "projection", duration: 0.9 });
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
