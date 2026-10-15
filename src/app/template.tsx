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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_PROJECTION }}
    >
      {children}
    </motion.div>
  );
}
