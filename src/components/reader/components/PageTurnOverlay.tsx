"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { easeTurn, freeEdgeOffset, leafAngles, type TurnPlan } from "../hooks/pageTurn";

/** Nombre de bandes : assez pour une courbure lisse, assez peu pour rester léger. */
const STRIPS = 16;

/** Dos d'une feuille sans verso : papier légèrement chaud. */
const PAPER = "hsl(40 28% 92%)";

const FACE: CSSProperties = {
  position: "absolute",
  inset: 0,
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  backgroundRepeat: "no-repeat",
};

const SHADE: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#000",
};

interface PageTurnOverlayProps {
  plan: TurnPlan;
  /** Durée du geste complet, en millisecondes. */
  duration: number;
  onDone: () => void;
}

/**
 * Tourné de page : l'ancienne page se soulève depuis la reliure, se courbe et
 * passe de l'autre côté, pendant que la nouvelle page apparaît dessous.
 *
 * L'overlay ne fait que rejouer un geste par-dessus la page déjà rendue : il
 * ne bloque ni la navigation ni le chargement, et s'efface à la fin.
 */
export function PageTurnOverlay({ plan, duration, onDone }: PageTurnOverlayProps) {
  const [elapsed, setElapsed] = useState(0);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setElapsed(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else onDoneRef.current();
    };
    frame = requestAnimationFrame(tick);
    // Onglet masqué : le navigateur suspend requestAnimationFrame. La feuille
    // ne doit jamais rester figée devant la page, la minuterie la retire.
    const fallback = setTimeout(() => onDoneRef.current(), duration + 400);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fallback);
    };
  }, [duration]);

  const progress = easeTurn(elapsed);
  const angles = leafAngles(progress, STRIPS);
  const { rect, url } = plan.leaf;
  const hingeLeft = plan.hinge === "left";
  const width = rect.width;
  const height = rect.height;
  const stripWidth = width / STRIPS;
  const backImage = plan.backUrl ? `url("${plan.backUrl}")` : undefined;

  // Feuille sans verso : son dos de papier s'efface à mesure qu'elle se pose,
  // puisqu'aucune page ne l'attend de l'autre côté.
  const leafOpacity = plan.backUrl ? 1 : progress < 0.55 ? 1 : Math.max(0, 1 - (progress - 0.55) / 0.45);

  // Ombre portée sur la page révélée, juste devant le bord libre.
  const edge = Math.max(0, freeEdgeOffset(angles)) * 100;
  const shadowAlpha = 0.5 * Math.sin(Math.PI * progress);

  let leaf: ReactNode = null;
  for (let index = STRIPS - 1; index >= 0; index--) {
    const angle = angles[index];
    const step = angle - (index === 0 ? 0 : angles[index - 1]);
    const radians = (angle * Math.PI) / 180;
    const left =
      index === 0 ? (hingeLeft ? 0 : width - stripWidth) : hingeLeft ? stripWidth : -stripWidth;
    const frontX = hingeLeft ? -(index * stripWidth) : -(width - (index + 1) * stripWidth);
    const backX = hingeLeft ? -(width - (index + 1) * stripWidth) : -(index * stripWidth);

    leaf = (
      <div
        style={{
          position: "absolute",
          top: 0,
          left,
          // Recouvrement d'un demi-pixel : aucune couture entre deux bandes.
          width: stripWidth + 0.6,
          height,
          transformOrigin: hingeLeft ? "left center" : "right center",
          transform: `rotateY(${hingeLeft ? -step : step}deg)`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Recto : l'ancienne page, assombrie à mesure qu'elle se dresse. */}
        <div
          style={{
            ...FACE,
            backgroundImage: `url("${url}")`,
            backgroundSize: `${width}px ${height}px`,
            backgroundPosition: `${frontX}px 0`,
          }}
        >
          <div style={{ ...SHADE, opacity: 0.28 * (1 - Math.cos(radians)) }} />
        </div>
        {/* Verso : la nouvelle page en double page, du papier sinon. */}
        <div
          style={{
            ...FACE,
            transform: "rotateY(180deg)",
            backgroundColor: PAPER,
            backgroundImage: backImage,
            backgroundSize: `${width}px ${height}px`,
            backgroundPosition: `${backX}px 0`,
          }}
        >
          <div style={{ ...SHADE, opacity: 0.28 * (1 + Math.cos(radians)) }} />
        </div>
        {leaf}
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-10">
      {/* Les anciennes pages restées à plat, jusqu'à ce que la feuille les recouvre. */}
      {plan.under.map((page) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={page.url}
          src={page.url}
          alt=""
          style={{
            position: "fixed",
            left: page.rect.left,
            top: page.rect.top,
            width: page.rect.width,
            height: page.rect.height,
          }}
        />
      ))}

      <div
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width,
          height,
          background: `linear-gradient(to ${hingeLeft ? "right" : "left"}, rgba(0,0,0,0) ${Math.max(0, edge - 0.5)}%, rgba(0,0,0,${shadowAlpha}) ${edge}%, rgba(0,0,0,0) ${Math.min(100, edge + 30)}%)`,
        }}
      />

      <div
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.top,
          width,
          height,
          opacity: leafOpacity,
          perspective: Math.max(1600, width * 3.2),
          perspectiveOrigin: hingeLeft ? "0% 50%" : "100% 50%",
        }}
      >
        {leaf}
      </div>
    </div>
  );
}
