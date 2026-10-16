"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  Fragment,
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
import { EASE_PROJECTION, dealIn, fadeUp, maskUp, settleIn, staggerContainer } from "@/lib/motion";

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

const EFFECT_VARIANTS: Record<StaggerEffect, Variants> = {
  rise: fadeUp,
  settle: settleIn,
  deal: dealIn,
};

/**
 * Équivalent CSS des variantes, pour la révélation autonome au défilement.
 * Les classes sont écrites en entier pour que Tailwind les détecte.
 */
const SCROLL_REVEAL_CLASSES: Record<StaggerEffect, { hidden: string; shown: string }> = {
  rise: {
    hidden: "opacity-0 translate-y-9 blur-[8px]",
    shown: "opacity-100 translate-y-0 blur-none",
  },
  settle: {
    hidden: "opacity-0 translate-y-12 scale-[0.9] blur-[10px]",
    shown: "opacity-100 translate-y-0 scale-100 blur-none",
  },
  deal: {
    hidden: "opacity-0 translate-x-20 scale-[0.9] blur-[10px]",
    shown: "opacity-100 translate-x-0 scale-100 blur-none",
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
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount, margin: VIEWPORT_MARGIN });
  const revealed = reduce ? true : inView;
  const contextValue = useMemo(
    () => ({ revealed, reduce: Boolean(reduce), reveal, stagger, effect }),
    [revealed, reduce, reveal, stagger, effect]
  );

  if (reduce) return <div className={className}>{children}</div>;

  const playsAsGroup = reveal === "group";

  return (
    <StaggerContext.Provider value={contextValue}>
      <motion.div
        ref={ref}
        className={className}
        variants={playsAsGroup ? staggerContainer(stagger, delayChildren) : undefined}
        initial={playsAsGroup ? "hidden" : false}
        animate={playsAsGroup ? (revealed ? "visible" : "hidden") : undefined}
      >
        {children}
      </motion.div>
    </StaggerContext.Provider>
  );
}

interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variants?: Variants;
}

export function StaggerItem({ children, className, style, variants }: StaggerItemProps) {
  const context = useContext(StaggerContext);
  const scrollReveal = context?.reveal === "scroll" && !context.reduce;
  const stagger = context?.stagger ?? 0.08;
  const effect = context?.effect ?? "rise";
  const itemVariants = variants ?? EFFECT_VARIANTS[effect];
  const ref = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ revealed: false, column: 0 });
  /**
   * Un élément monté alors que le groupe est déjà révélé — changement de page
   * d'une grille, « voir plus » d'un rail — n'hérite d'aucune transition : il
   * doit jouer la sienne, faute de quoi il resterait bloqué à opacity 0.
   */
  const [mountedAfterReveal] = useState(() => context?.revealed ?? false);

  useEffect(() => {
    if (!scrollReveal) return;
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
  }, [scrollReveal]);

  if (!context || context.reduce) {
    return (
      <motion.div className={className} style={style} variants={itemVariants} initial={false} animate="visible">
        {children}
      </motion.div>
    );
  }

  /**
   * Révélation autonome en CSS — même geste que la variante de l'effet, sur la
   * courbe projection. Une transition CSS ne peut pas rester bloquée à
   * opacity 0 : au pire la carte se décale, elle n'a jamais l'occasion de
   * disparaître, contrairement à une variante dont le déclencheur se perd.
   */
  if (scrollReveal) {
    const classes = SCROLL_REVEAL_CLASSES[effect];
    return (
      <div
        ref={ref}
        className={cn(
          "transition-[opacity,translate,scale,filter] ease-projection duration-1000 motion-reduce:transition-none",
          scrollState.revealed ? classes.shown : classes.hidden,
          className
        )}
        style={{
          ...style,
          transitionDelay: `${Math.round(scrollState.column * stagger * 1000)}ms`,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      variants={itemVariants}
      initial={mountedAfterReveal ? "hidden" : undefined}
      animate={mountedAfterReveal ? "visible" : undefined}
    >
      {children}
    </motion.div>
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
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, { stiffness: 260, damping: 18, mass: 0.6 });
  const y = useSpring(0, { stiffness: 260, damping: 18, mass: 0.6 });

  const handleMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (reduce) return;
      const element = ref.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
      y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [reduce, strength, x, y]
  );

  const handleLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      ref={ref}
      className={cn("inline-flex", className)}
      style={{ x, y }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
    </motion.div>
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
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const [display, setDisplay] = useState(0);

  useMotionValueEvent(rounded, "change", (latest) => setDisplay(latest));

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration, ease: EASE_PROJECTION });
    return () => controls.stop();
  }, [count, value, duration, reduce]);

  return (
    <span className={className}>
      {display}
      {suffix}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * ScrollProgress — le fil du projecteur, en haut de l'écran.
 * ---------------------------------------------------------------------- */

export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 26,
    restDelta: 0.001,
  });

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-primary"
      style={{ scaleX }}
    />
  );
}

/* -------------------------------------------------------------------------
 * SplitWords — un titre dont chaque mot sort de son masque, l'un après l'autre.
 *
 * Le composant est un enfant de variantes : il hérite de l'état
 * hidden/visible de son parent et déroule sa propre cascade. Sans animation,
 * le texte est simplement là.
 * ---------------------------------------------------------------------- */

interface SplitWordsProps {
  text: string;
  /** Cadence mot à mot. */
  stagger?: number;
}

const splitWordsContainer = staggerContainer(0.07, 0);

export function SplitWords({ text, stagger }: SplitWordsProps) {
  const reduce = useReducedMotion();
  const variants = useMemo(
    () => (stagger === undefined ? splitWordsContainer : staggerContainer(stagger, 0)),
    [stagger]
  );

  if (reduce) return <>{text}</>;

  const words = text.split(" ");
  return (
    <motion.span variants={variants} className="inline">
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span variants={maskUp} className="inline-block will-change-transform">
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </motion.span>
  );
}

/* -------------------------------------------------------------------------
 * useSceneExit — un bandeau quitte la scène au défilement.
 *
 * Tant que le bandeau sort par le haut, le fond descend moins vite que la
 * page (parallaxe), le contenu s'éloigne et s'éteint : la salle se rallume
 * sur la suite. Les valeurs restent neutres sous `prefers-reduced-motion`.
 * ---------------------------------------------------------------------- */

export function useSceneExit(ref: RefObject<HTMLElement | null>) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 220, damping: 32, restDelta: 0.001 });

  const backdropY = useTransform(progress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "38%"]);
  const backdropScale = useTransform(progress, [0, 1], reduce ? [1, 1] : [1, 1.12]);
  const contentY = useTransform(progress, [0, 1], reduce ? [0, 0] : [0, 90]);
  const contentOpacity = useTransform(progress, [0, 0.75], reduce ? [1, 1] : [1, 0]);
  const contentBlur = useTransform(progress, [0, 0.75], reduce ? ["blur(0px)", "blur(0px)"] : ["blur(0px)", "blur(6px)"]);
  const sceneScale = useTransform(progress, [0, 1], reduce ? [1, 1] : [1, 0.92]);

  return { backdropY, backdropScale, contentY, contentOpacity, contentBlur, sceneScale };
}
