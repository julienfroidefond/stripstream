"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { EASE_PROJECTION } from "@/lib/motion";

/**
 * Chaque changement de route remonte le rideau : le contenu se pose au lieu
 * de se substituer. Le lecteur plein écran orchestre sa propre mise en scène.
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  if (reduce || pathname.startsWith("/books/")) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      // Le filtre est retiré une fois posé : un `filter` résiduel ferait du
      // conteneur le bloc de référence des éléments `position: fixed`.
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
      transition={{ duration: 0.7, ease: EASE_PROJECTION }}
    >
      {children}
    </motion.div>
  );
}
