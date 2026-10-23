"use client";

import { gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGsapEffect } from "@/lib/gsap";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

/** Seuil de déclenchement d'une révélation au défilement. */
type ViewportAmount = number | "some" | "all";

/**
 * Marge de détection : on garde une réserve sous le pli (la révélation attend
 * le défilement) mais on élargit largement vers le haut.
 *
 * Un navigateur restaure la position de défilement au retour sur une page :
 * le contenu situé au-dessus de l'écran doit être considéré comme déjà vu,
 * sinon il resterait invisible tant que l'utilisateur ne remonterait pas.
 */
export const VIEWPORT_MARGIN = "4000px 0px -8% 0px";

/* -------------------------------------------------------------------------
 * Stagger — une grille ou un rail se déploie carte par carte.
 *
 * Deux régimes :
 *  - "group" : le parent déclenche, les enfants héritent : un enfant hors écran
 *    horizontalement reste donc solidaire de son rail ;
 *  - "scroll" : chaque carte guette sa propre entrée dans la fenêtre. Une liste
 *    longue se révèle alors ligne par ligne au défilement, au lieu de jouer
 *    toute son animation hors écran avant que l'utilisateur n'y arrive.
 * ---------------------------------------------------------------------- */

type StaggerReveal = "group" | "scroll";

/**
 * Geste d'entrée, choisi par nature de contenu :
 *  - "rise"   : le texte et les listes montent en faisant le point ;
 *  - "settle" : les couvertures d'une grille montent, grandissent et font le point ;
 *  - "deal"   : les affiches d'un rail horizontal arrivent de la droite en
 *    pivotant, comme une main de cartes qu'on étale.
 */
type StaggerEffect = "rise" | "settle" | "deal";

const EFFECT_MOTION: Record<
  StaggerEffect,
  { from: gsap.TweenVars; to: gsap.TweenVars; duration: number; ease?: string }
> = {
  rise: {
    from: { opacity: 0, y: 36, filter: "blur(8px)" },
    to: { opacity: 1, y: 0, filter: "blur(0px)" },
    duration: 0.9,
  },
  settle: {
    from: { opacity: 0, y: 48, scale: 0.9, filter: "blur(10px)" },
    to: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    duration: 1,
  },
  // Même relief que le hero : chaque cover remonte du fond en pivotant et
  // dépasse un peu sa place, comme une carte qu'on pose sur la table.
  deal: {
    from: {
      opacity: 0,
      x: 70,
      z: -320,
      rotateY: -35,
      transformPerspective: 900,
    },
    to: {
      opacity: 1,
      x: 0,
      z: 0,
      rotateY: 0,
      transformPerspective: 900,
    },
    duration: 0.6,
    ease: "back.out(1.5)",
  },
};

interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  /** En "group" : cadence carte à carte. En "scroll" : cadence colonne à colonne. */
  stagger?: number;
  delayChildren?: number;
  amount?: ViewportAmount;
  once?: boolean;
  reveal?: StaggerReveal;
  effect?: StaggerEffect;
}

/** État partagé du groupe : les enfants montés après coup savent s'animer seuls. */
const StaggerContext = createContext<{
  revealed: boolean;
  reduce: boolean;
  reveal: StaggerReveal;
  stagger: number;
  delayChildren: number;
  effect: StaggerEffect;
} | null>(null);

/**
 * Rang de la carte dans sa ligne. On le lit sur la mise en page plutôt que de
 * compter les colonnes : la grille est responsive, donc sa largeur change avec
 * la fenêtre. Les voisines qui partagent le même `offsetTop` forment la ligne.
 */
function columnIndexWithinRow(element: HTMLElement): number {
  const parent = element.parentElement;
  if (!parent) return 0;
  const row = element.offsetTop;
  const index = Array.from(parent.children)
    .filter((sibling): sibling is HTMLElement => sibling instanceof HTMLElement && sibling.offsetTop === row)
    .indexOf(element);
  return Math.max(index, 0);
}

export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0.06,
  amount = 0.12,
  once = true,
  reveal = "group",
  effect = "rise",
}: StaggerGroupProps) {
  const prefersReduce = usePrefersReducedMotion();
  const reduce = Boolean(prefersReduce);
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const isRevealed = reduce || revealed;

  useEffect(() => {
    if (reduce) return;
    if (reveal !== "group") return;
    const element = ref.current;
    if (!element) return;
    const threshold =
      typeof amount === "number" ? amount : amount === "all" ? 1 : 0.01;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setRevealed(false);
        }
      },
      { rootMargin: VIEWPORT_MARGIN, threshold }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [amount, once, reduce, reveal]);

  const contextValue = useMemo(
    () => ({ revealed: isRevealed, reduce, reveal, stagger, delayChildren, effect }),
    [isRevealed, reduce, reveal, stagger, delayChildren, effect]
  );

  return (
    <StaggerContext.Provider value={contextValue}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </StaggerContext.Provider>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Rang de la carte dans sa vague, pour la cascade du groupe. Seules comptent
 * les voisines précédentes encore en attente (`data-stagger-item`) : une
 * carte ajoutée par « Voir plus » ouvre sa propre vague au lieu d'attendre
 * derrière toutes celles déjà posées.
 */
function waveIndex(element: HTMLElement | null): number {
  let index = 0;
  let sibling = element?.previousElementSibling ?? null;
  while (sibling) {
    if (sibling.hasAttribute("data-stagger-item")) index += 1;
    sibling = sibling.previousElementSibling;
  }
  return index;
}

export function StaggerItem({ children, className, style }: StaggerItemProps) {
  const context = useContext(StaggerContext);
  const prefersReduce = usePrefersReducedMotion();
  const reduce = Boolean(context?.reduce ?? prefersReduce);
  const effect = context?.effect ?? "rise";
  const reveal = context?.reveal ?? "group";
  const stagger = context?.stagger ?? 0.08;
  const delayChildren = context?.delayChildren ?? 0.06;

  const ref = useRef<HTMLDivElement>(null);
  const played = useRef(false);
  const [scrollState, setScrollState] = useState({ revealed: false, column: 0 });

  useEffect(() => {
    if (!context || reduce || reveal !== "scroll") return;
    const element = ref.current;
    if (!element) return;
    /**
     * Le rang est lu avant la révélation : la carte connaît donc sa colonne
     * dans la même passe que son entrée en scène, et la ligne se déploie de
     * gauche à droite. Un observateur par carte, débranché aussitôt révélé.
     */
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setScrollState({ revealed: true, column: columnIndexWithinRow(element) });
        observer.disconnect();
      },
      { rootMargin: VIEWPORT_MARGIN, threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [context, reduce, reveal]);

  const shouldPlay = context
    ? reveal === "group"
      ? context.revealed
      : scrollState.revealed
    : false;

  useGsapEffect(
    () => {
      const element = ref.current;
      if (!element) return;

      if (reduce || prefersReducedMotion()) {
        element.removeAttribute("data-stagger-item");
        gsap.set(element, { clearProps: "opacity,transform,filter" });
        return;
      }

      if (!shouldPlay || played.current) return;

      played.current = true;
      const motion = EFFECT_MOTION[effect];
      const delay = reveal === "group"
        ? delayChildren + waveIndex(element) * stagger
        : scrollState.column * stagger;

      const tween = gsap.fromTo(element, motion.from, {
        ...motion.to,
        duration: motion.duration,
        delay,
        ease: motion.ease ?? "projection",
        overwrite: "auto",
        onComplete: () => {
          element.removeAttribute("data-stagger-item");
          gsap.set(element, { clearProps: "opacity,transform,filter" });
        },
      });

      return () => {
        // Interrompue avant la fin (double montage StrictMode, dépendance qui
        // change), l'entrée doit pouvoir rejouer : sinon la carte reste figée
        // dans son état de départ, invisible.
        if (tween.progress() < 1) played.current = false;
        tween.kill();
      };
    },
    {
      dependencies: [
        delayChildren,
        effect,
        reduce,
        reveal,
        scrollState.column,
        shouldPlay,
        stagger,
      ],
    }
  );

  return (
    <div
      ref={ref}
      className={className}
      style={style}
      data-stagger-item={reduce || !context ? undefined : effect}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Magnetic — un appel à l'action suit légèrement le curseur.
 * ---------------------------------------------------------------------- */

interface MagneticProps {
  children: ReactNode;
  className?: string;
  /** Amplitude du suivi, 0 = immobile. */
  strength?: number;
}

export function Magnetic({ children, className, strength = 0.16 }: MagneticProps) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    return () => {
      if (element) gsap.killTweensOf(element);
    };
  }, []);

  const handleMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const element = ref.current;
      if (!element || reduce || prefersReducedMotion()) return;
      const rect = element.getBoundingClientRect();
      gsap.to(element, {
        x: (event.clientX - (rect.left + rect.width / 2)) * strength,
        y: (event.clientY - (rect.top + rect.height / 2)) * strength,
        duration: 0.35,
        ease: "out",
        overwrite: "auto",
      });
    },
    [reduce, strength]
  );

  // Relâché, le bouton revient en place avec un petit rebond.
  const handleLeave = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: 0.9,
      ease: "elastic.out(1, 0.4)",
      overwrite: "auto",
    });
  }, []);

  return (
    <div
      ref={ref}
      className={cn("inline-flex", className)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Halo de survol — la lumière du projecteur suit le curseur sur une carte.
 * La variable CSS est posée par le parent, le rendu reste en CSS.
 * ---------------------------------------------------------------------- */

export function usePointerGlow<T extends HTMLElement>(ref: RefObject<T | null>) {
  return useCallback(
    (event: ReactMouseEvent<T>) => {
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      element.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
      element.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
    },
    [ref]
  );
}

export function GlowLayer({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "glow-layer pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        className
      )}
    />
  );
}

/* -------------------------------------------------------------------------
 * CountUp — un pourcentage qui se compte au lieu d'apparaître.
 * ---------------------------------------------------------------------- */

interface CountUpProps {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}

export function CountUp({ value, suffix = "", className, duration = 1.1 }: CountUpProps) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(0);

  /**
   * Le compteur écrit directement dans le nœud texte rendu par React : aucun
   * re-render par frame, et React garde la main sur ce même nœud.
   */
  useGsapEffect(
    () => {
      const element = ref.current;
      if (!element) return;
      const write = (latest: number) => {
        const text = `${Math.round(latest)}${suffix}`;
        if (element.firstChild) element.firstChild.nodeValue = text;
        else element.textContent = text;
      };

      if (reduce || prefersReducedMotion()) {
        current.current = value;
        write(value);
        return;
      }

      const state = { count: current.current };
      const tween = gsap.to(state, {
        count: value,
        duration,
        ease: "projection",
        onUpdate: () => {
          current.current = state.count;
          write(state.count);
        },
      });
      return () => tween.kill();
    },
    { dependencies: [value, suffix, duration, reduce] }
  );

  return (
    <span ref={ref} className={className}>
      {`${reduce ? value : 0}${suffix}`}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * ProgressFill — une barre de progression qui se remplit une fois posée.
 * ---------------------------------------------------------------------- */

interface ProgressFillProps {
  /** Avancement, de 0 à 100. */
  percent: number;
  className?: string;
  delay?: number;
}

export function ProgressFill({ percent, className, delay = 0.35 }: ProgressFillProps) {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useGsapEffect(
    () => {
      const element = ref.current;
      if (!element) return;
      if (reduce || prefersReducedMotion()) {
        gsap.set(element, { scaleX: percent / 100 });
        return;
      }
      const tween = gsap.fromTo(
        element,
        { scaleX: 0 },
        { scaleX: percent / 100, duration: 0.8, delay, ease: "projection" }
      );
      return () => tween.kill();
    },
    { dependencies: [percent, delay, reduce] }
  );

  return (
    <div
      ref={ref}
      className={cn("h-full w-full origin-left rounded-full bg-primary", className)}
      style={{ transform: "scaleX(0)" }}
    />
  );
}

/* -------------------------------------------------------------------------
 * ScrollProgress — le fil du projecteur, en haut de l'écran.
 * ---------------------------------------------------------------------- */

export function ScrollProgress() {
  const reduce = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useGsapEffect(
    () => {
      const bar = ref.current;
      if (!bar || reduce || prefersReducedMotion()) return;
      // `quickTo` lisse le suivi : le fil rattrape le défilement au lieu de sauter.
      const follow = gsap.quickTo(bar, "scaleX", { duration: 0.35, ease: "out" });
      gsap.set(bar, { scaleX: 0, transformOrigin: "0% 50%" });
      const trigger = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => follow(self.progress),
      });
      follow(trigger.progress);
      return () => trigger.kill();
    },
    { dependencies: [reduce] }
  );

  if (reduce) return null;

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-primary"
      style={{ transform: "scaleX(0)" }}
    />
  );
}

/* -------------------------------------------------------------------------
 * playGridExit — les cartes d'une grille quittent la scène avant un
 * changement de page, de tri ou de filtre.
 *
 * `container` enveloppe la grille : ses cartes sont les enfants de son premier
 * enfant. Seules les cartes à l'écran jouent la sortie (rapide, en cascade) ;
 * les autres s'éteignent d'un coup. La promesse se résout à la fin, l'appelant
 * navigue alors. Si la grille n'a pas été remplacée au bout de quelques
 * secondes (même résultat, navigation annulée), les cartes reviennent.
 * ---------------------------------------------------------------------- */

const GRID_EXIT_RESTORE = 2.5;

export function playGridExit(container: HTMLElement | null): Promise<void> {
  const grid = container?.firstElementChild;
  const cards = grid ? (Array.from(grid.children) as HTMLElement[]) : [];
  if (cards.length === 0 || prefersReducedMotion()) return Promise.resolve();

  const visible = cards.filter((card) => {
    const rect = card.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  });
  gsap.set(
    cards.filter((card) => !visible.includes(card)),
    { opacity: 0 }
  );

  gsap.delayedCall(GRID_EXIT_RESTORE, () => {
    const remaining = cards.filter((card) => card.isConnected);
    if (remaining.length === 0) return;
    gsap.to(remaining, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.3,
      ease: "projection",
      clearProps: "opacity,transform",
    });
  });

  return new Promise((resolve) => {
    gsap.to(visible, {
      opacity: 0,
      y: 18,
      scale: 0.94,
      duration: 0.22,
      stagger: 0.012,
      ease: "power2.in",
      overwrite: "auto",
      onComplete: () => resolve(),
    });
  });
}

/* -------------------------------------------------------------------------
 * useBannerScene — un bandeau d'en-tête (bibliothèque, série) entre en scène
 * puis quitte la scène au défilement.
 *
 * Entrée, même relief que le hero de l'accueil : l'écran se déroule
 * (`[data-banner-unroll]`), la cover arrive du fond (`[data-hero-fly]`), les
 * mots du titre basculent en 3D (`[data-banner-title]`), le reste remonte
 * (`[data-hero-item]`). Sortie, pilotée par ScrollTrigger : le fond
 * (`[data-banner-backdrop]`) descend moins vite que la page, le contenu
 * (`[data-banner-content]`) s'éloigne et s'éteint. Les états de départ sont
 * en CSS ; rien ne bouge sous `prefers-reduced-motion`.
 * ---------------------------------------------------------------------- */

export function useBannerScene(ref: RefObject<HTMLElement | null>) {
  const reduce = usePrefersReducedMotion();

  useGsapEffect(
    () => {
      const root = ref.current;
      if (!root) return;
      const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));
      const unroll = all("[data-banner-unroll]");
      const fliers = all("[data-hero-fly]");
      const titles = all("[data-banner-title]");
      const items = all("[data-hero-item]");
      const backdrop = root.querySelector<HTMLElement>("[data-banner-backdrop]");
      const content = root.querySelector<HTMLElement>("[data-banner-content]");

      const settle = () => {
        unroll.forEach((element) => element.removeAttribute("data-banner-unroll"));
        fliers.forEach((element) => element.removeAttribute("data-hero-fly"));
        items.forEach((element) => element.removeAttribute("data-hero-item"));
        gsap.set([...unroll, ...fliers, ...items], {
          clearProps: "opacity,transform,clipPath",
        });
      };

      if (reduce || prefersReducedMotion()) {
        settle();
        return;
      }

      const splits = titles.map((title) => SplitText.create(title, { type: "words" }));
      const words = splits.flatMap((split) => split.words);
      const intro = gsap.timeline({
        defaults: { ease: "projection" },
        onComplete: () => {
          splits.forEach((split) => split.revert());
          settle();
        },
      });

      if (unroll.length > 0) {
        intro.fromTo(
          unroll,
          { clipPath: "inset(0% 0% 100% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "power3.inOut" },
          0
        );
      }
      if (fliers.length > 0) {
        intro.fromTo(
          fliers,
          {
            opacity: 0,
            x: -120,
            z: -600,
            rotateY: -75,
            rotateX: 18,
            rotateZ: -7,
            transformPerspective: 900,
          },
          {
            opacity: 1,
            x: 0,
            z: 0,
            rotateY: 0,
            rotateX: 0,
            rotateZ: 0,
            duration: 0.8,
            ease: "back.out(1.5)",
          },
          0.15
        );
      }
      if (items.length > 0) {
        intro.fromTo(
          items,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.45, stagger: 0.05 },
          0.25
        );
      }
      if (words.length > 0) {
        intro.fromTo(
          words,
          {
            opacity: 0,
            yPercent: 70,
            z: -160,
            rotateX: -95,
            transformPerspective: 600,
            transformOrigin: "50% 100%",
          },
          {
            opacity: 1,
            yPercent: 0,
            z: 0,
            rotateX: 0,
            duration: 0.6,
            ease: "back.out(2)",
            stagger: 0.05,
          },
          0.3
        );
      }

      const exit =
        backdrop && content
          ? gsap
              .timeline({
                scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.5 },
              })
              .to(backdrop, { yPercent: 38, scale: 1.12, ease: "none" }, 0)
              .to(content, { y: 90, opacity: 0, ease: "power1.in" }, 0)
          : null;

      return () => {
        intro.kill();
        splits.forEach((split) => split.revert());
        exit?.scrollTrigger?.kill();
        exit?.revert();
      };
    },
    { dependencies: [reduce] }
  );
}

/* -------------------------------------------------------------------------
 * usePresence — garde un élément monté le temps de sa sortie.
 *
 * Remplace `AnimatePresence` : l'élément est rendu tant que `show` est vrai
 * ou que sa sortie joue. `enter` / `exit` remplissent la timeline ; `still`
 * vaut vrai sous `prefers-reduced-motion`, à charge pour eux de se réduire à
 * un fondu. Rendre l'élément si et seulement si la valeur renvoyée est vraie.
 * ---------------------------------------------------------------------- */

type PresenceStep = (timeline: gsap.core.Timeline, element: HTMLElement, still: boolean) => void;

export function usePresence(
  show: boolean,
  ref: RefObject<HTMLElement | null>,
  steps: { enter: PresenceStep; exit: PresenceStep }
): boolean {
  const [rendered, setRendered] = useState(show);
  // Dérivé de `show` pendant le rendu : l'élément est présent dès la frame
  // où il doit entrer, sans attendre un effet.
  if (show && !rendered) setRendered(true);

  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  });

  useGsapEffect(
    () => {
      const element = ref.current;
      if (!element || !rendered) return;
      const still = prefersReducedMotion();
      const timeline = gsap.timeline({ defaults: { ease: "projection" } });

      if (show) {
        stepsRef.current.enter(timeline, element, still);
      } else {
        stepsRef.current.exit(timeline, element, still);
        if (timeline.duration() === 0) {
          setRendered(false);
        } else {
          timeline.eventCallback("onComplete", () => setRendered(false));
        }
      }

      return () => timeline.kill();
    },
    { dependencies: [show, rendered] }
  );

  return rendered;
}
