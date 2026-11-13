"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, type ComponentProps, type FocusEvent, type PointerEvent } from "react";

/** Temps de survol avant de précharger : un balayage de la souris sur une grille ne déclenche rien. */
export const INTENT_PREFETCH_DELAY_MS = 150;

type IntentLinkProps = Omit<ComponentProps<typeof Link>, "prefetch" | "href"> & { href: string };

/**
 * Lien pour les collections denses (grilles, rangées, mur, résultats).
 *
 * Le `<Link>` par défaut précharge chaque lien qui entre dans le viewport : une
 * grille de 90 séries ou le mur (420 tuiles visibles d'un coup) émettait autant
 * de requêtes RSC `/series/<id>?_rsc=…`, et le proxy les a limitées en 429 puis
 * a blacklisté le serveur. Ici le préchargement automatique est coupé
 * (`prefetch={false}`, ce qui coupe aussi celui au survol) et remplacé par un
 * préchargement d'intention : focus clavier ou appui immédiat, survol après
 * `INTENT_PREFETCH_DELAY_MS`, une seule fois par lien monté.
 */
export function IntentLink({
  href,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onFocus,
  ...props
}: IntentLinkProps) {
  const router = useRouter();
  const prefetched = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHover = useCallback(() => {
    if (hoverTimer.current !== null) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const prefetchNow = useCallback(() => {
    cancelHover();
    if (prefetched.current) return;
    prefetched.current = true;
    router.prefetch(href);
  }, [cancelHover, href, router]);

  useEffect(() => {
    prefetched.current = false;
  }, [href]);

  useEffect(() => cancelHover, [cancelHover]);

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerEnter?.(event);
        // Le toucher n'a pas de survol : l'appui suffit (onPointerDown).
        if (event.pointerType === "mouse" && !prefetched.current) {
          cancelHover();
          hoverTimer.current = setTimeout(prefetchNow, INTENT_PREFETCH_DELAY_MS);
        }
      }}
      onPointerLeave={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerLeave?.(event);
        cancelHover();
      }}
      onPointerDown={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerDown?.(event);
        prefetchNow();
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(event);
        prefetchNow();
      }}
    />
  );
}
