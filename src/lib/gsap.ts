"use client";

import { useEffect, useLayoutEffect, type DependencyList } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";
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
  gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText, Flip);

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

const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect;

type GsapCleanup = void | (() => void);

/**
 * Effet GSAP lié au cycle de vie React, joué avant la peinture.
 *
 * L'effet s'exécute dans un `gsap.context` ; à chaque changement de
 * `dependencies` comme au démontage, la fonction de nettoyage qu'il renvoie
 * est appelée et les animations qu'il a créées sont tuées (sans être
 * annulées : les éléments restent dans l'état où l'effet les a laissés).
 *
 * `useGSAP` (`@gsap/react`) ne fait pas cela : avec des dépendances et sans
 * `revertOnUpdate`, il repousse tout nettoyage au démontage, si bien qu'une
 * boucle `repeat: -1` démarrée sous condition ne s'arrêtait jamais.
 */
export function useGsapEffect(
  effect: () => GsapCleanup,
  { dependencies = [] }: { dependencies?: DependencyList } = {}
): void {
  useIsomorphicLayoutEffect(() => {
    let cleanup: GsapCleanup;
    const context = gsap.context(() => {
      cleanup = effect();
    });
    return () => {
      if (typeof cleanup === "function") cleanup();
      context.kill();
    };
    // Les dépendances sont fournies par l'appelant, comme pour `useEffect`.
  }, dependencies);
}

export { gsap, Flip, ScrollTrigger, SplitText };
