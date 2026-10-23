"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";

import { SeriesCover } from "@/components/ui/series-cover";
import { wallItemToSeries } from "@/lib/wall-cover";
import type { WallItem, WallRenderTile } from "@/types/wall";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/gsap";

/** Pose de survol d'une affiche : soulèvement, inclinaison, traction. */
interface TiltPose {
  lift: number;
  rotateX: number;
  rotateY: number;
  pullX: number;
  pullY: number;
}

const REST: TiltPose = { lift: 0, rotateX: 0, rotateY: 0, pullX: 0, pullY: 0 };
const POSE_KEYS = Object.keys(REST) as (keyof TiltPose)[];
/** Part du chemin restant parcourue en une frame à 60 Hz. */
const TILT_SMOOTHING = 0.2;
const TILT_EPSILON = 0.002;

/** Mêmes conditions que l'ancien `:hover` CSS : souris fine, mur au repos. */
function canTilt(link: HTMLElement): boolean {
  if (prefersReducedMotion()) return false;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return false;
  if (link.hasAttribute("data-active")) return false;
  const stage = link.closest(".wall-stage");
  return !stage?.hasAttribute("data-panning") && !stage?.hasAttribute("data-plaque");
}

export interface WallTileProps {
  item: WallItem;
  tile: WallRenderTile;
  active: boolean;
  flash: boolean;
  /** L'animation d'entrée n'est jouée qu'à l'ouverture du mur. */
  enter: boolean;
  reduce: boolean;
  onSelect: (tile: WallRenderTile) => void;
  /** Signale le survol d'une copie (le voile du fond attend un instant). */
  onHover: (key: string, hovered: boolean) => void;
}

/**
 * Une œuvre du mur.
 *
 * La tuile ne bouge pas d'elle-même : c'est la caméra qui vient la chercher
 * au clic, jusqu'à la poser au centre. Le survol ne fait que la mettre en
 * lumière, sans jamais déplacer les voisines.
 */
function WallTileComponent({
  item,
  tile,
  active,
  flash,
  enter,
  reduce,
  onSelect,
  onHover,
}: WallTileProps) {
  const delay = reduce ? 0 : Math.min(900, (tile.order % 16) * 34);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Un clic clavier garde la navigation directe : la plaque est un
      // supplément pour la souris et le tactile, pas un détour obligé.
      if (event.detail === 0) return;
      event.preventDefault();
      onSelect(tile);
    },
    [onSelect, tile]
  );

  /**
   * Le survol suit le curseur : la tuile se soulève, s'incline et une lumière
   * court sur l'affiche. La pose est lissée à chaque frame vers la cible posée
   * par le pointeur, au lieu de relancer une transition CSS à chaque
   * `pointermove` : à la cadence irrégulière d'une vraie souris, ces relances
   * faisaient avancer le cadre par à-coups, et la tuile tremblait tant que la
   * main bougeait. Une seule tuile est survolée : une seule boucle tourne.
   */
  const linkRef = useRef<HTMLAnchorElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({
    hovered: false,
    target: { ...REST },
    current: { ...REST },
    raf: null as number | null,
    last: 0,
  });

  const runTilt = useCallback(() => {
    const state = tiltRef.current;
    if (state.raf !== null) return;
    state.last = performance.now();

    const step = (now: number) => {
      const link = linkRef.current;
      const frame = frameRef.current;
      if (!link || !frame) {
        state.raf = null;
        return;
      }
      const elapsed = Math.min(64, now - state.last);
      state.last = now;
      const k = 1 - Math.pow(1 - TILT_SMOOTHING, elapsed / (1000 / 60));
      const target = state.hovered && canTilt(link) ? state.target : REST;

      let settled = true;
      for (const key of POSE_KEYS) {
        const delta = target[key] - state.current[key];
        if (Math.abs(delta) > TILT_EPSILON) settled = false;
        state.current[key] += delta * k;
      }

      const pose = state.current;
      if (settled && !state.hovered) {
        frame.style.removeProperty("transform");
        state.current = { ...REST };
        state.raf = null;
        return;
      }
      frame.style.transform =
        `translate3d(${pose.pullX.toFixed(2)}px, ${(pose.pullY - 7 * pose.lift).toFixed(2)}px, 0) ` +
        `scale(${(1 + 0.015 * pose.lift).toFixed(4)}) ` +
        `rotateX(${pose.rotateX.toFixed(2)}deg) rotateY(${pose.rotateY.toFixed(2)}deg)`;
      state.raf = window.requestAnimationFrame(step);
    };

    state.raf = window.requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const state = tiltRef.current;
    return () => {
      if (state.raf !== null) window.cancelAnimationFrame(state.raf);
    };
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (event.pointerType !== "mouse") return;
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      // Bornée à la tuile : au-delà du bord, la traction ne suit plus le curseur.
      const px = Math.min(0.5, Math.max(-0.5, (event.clientX - rect.left) / rect.width - 0.5));
      const py = Math.min(0.5, Math.max(-0.5, (event.clientY - rect.top) / rect.height - 0.5));
      const state = tiltRef.current;
      state.hovered = true;
      state.target = { lift: 1, rotateX: -py * 6, rotateY: px * 8, pullX: px * 10, pullY: py * 8 };
      element.style.setProperty("--wall-light-x", `${((px + 0.5) * 100).toFixed(1)}%`);
      element.style.setProperty("--wall-light-y", `${((py + 0.5) * 100).toFixed(1)}%`);
      runTilt();
    },
    [runTilt]
  );

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (event.pointerType !== "mouse") return;
      onHover(tile.key, true);
    },
    [onHover, tile.key]
  );

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      const element = event.currentTarget;
      element.style.removeProperty("--wall-light-x");
      element.style.removeProperty("--wall-light-y");
      tiltRef.current.hovered = false;
      tiltRef.current.target = { ...REST };
      runTilt();
      if (event.pointerType === "mouse") onHover(tile.key, false);
    },
    [onHover, runTilt, tile.key]
  );

  return (
    <Link
      ref={linkRef}
      href={`/series/${item.id}`}
      aria-label={item.name}
      aria-haspopup="dialog"
      aria-expanded={active || undefined}
      data-wall-key={tile.key}
      data-active={active || undefined}
      data-flash={flash || undefined}
      data-enter={enter || undefined}
      draggable={false}
      className={cn(
        "wall-tile absolute block rounded-[10px] outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-[3px] focus-visible:ring-offset-background"
      )}
      style={{
        left: tile.x,
        top: tile.y,
        width: tile.width,
        height: tile.height,
        ["--wall-delay" as string]: `${delay}ms`,
      }}
      onDragStart={(event) => event.preventDefault()}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    >
      <div ref={frameRef} className="wall-tile-frame relative h-full w-full overflow-hidden bg-surface-2">
        <SeriesCover
          series={wallItemToSeries(item)}
          alt=""
          showProgressUi={false}
          eager={tile.visible}
          fetchPriority={tile.visible && tile.order < 8 ? "high" : "auto"}
          className="transition-none"
        />
      </div>
    </Link>
  );
}

/**
 * Les copies du mur sont re-rendues à chaque déplacement de caméra (la liste
 * visible est recalculée), mais leur géométrie et leur série ne changent pas.
 * On les laisse donc tranquilles : seules les tuiles qui entrent ou sortent
 * du cadre montent ou descendent.
 */
function sameWallTile(previous: WallTileProps, next: WallTileProps): boolean {
  return (
    previous.item.id === next.item.id &&
    previous.tile.key === next.tile.key &&
    previous.tile.x === next.tile.x &&
    previous.tile.y === next.tile.y &&
    previous.tile.width === next.tile.width &&
    previous.tile.height === next.tile.height &&
    previous.tile.itemIndex === next.tile.itemIndex &&
    previous.tile.visible === next.tile.visible &&
    previous.active === next.active &&
    previous.flash === next.flash &&
    previous.enter === next.enter &&
    previous.reduce === next.reduce &&
    previous.onSelect === next.onSelect &&
    previous.onHover === next.onHover
  );
}

export const WallTile = memo(WallTileComponent, sameWallTile);
WallTile.displayName = "WallTile";
