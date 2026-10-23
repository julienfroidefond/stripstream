"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Chaque changement de route remonte le rideau : le contenu se pose au lieu
 * de se substituer. Le lecteur plein écran orchestre sa propre mise en scène.
 *
 * L'état de départ est porté par `data-route-enter` (CSS), pas par un style
 * inline calculé côté client : le HTML arrive déjà dans le bon état et GSAP
 * n'a plus qu'à le faire évoluer. Sans JS, la media query `scripting: none`
 * rend le contenu visible.
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const skip = pathname.startsWith("/books/");

  useGSAP(
    () => {
      const element = ref.current;
      if (!element || skip) return;
      if (reduce || prefersReducedMotion()) {
        element.removeAttribute("data-route-enter");
        gsap.set(element, { clearProps: "opacity,transform,filter" });
        return;
      }

      const timeline = gsap.timeline({
        onComplete: () => {
          element.removeAttribute("data-route-enter");
          // Un `filter` résiduel ferait du conteneur le bloc de référence des
          // éléments `position: fixed` : on rend la main au navigateur.
          gsap.set(element, { clearProps: "opacity,transform,filter" });
        },
      });

      timeline.to(element, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: "projection",
      });

      return () => timeline.kill();
    },
    { scope: ref, dependencies: [pathname, reduce, skip] }
  );

  if (skip) return <>{children}</>;

  return (
    <div ref={ref} data-route-enter>
      {children}
    </div>
  );
}
