"use client";

import { memo, useCallback } from "react";
import Link from "next/link";

import { SeriesCover } from "@/components/ui/series-cover";
import { wallItemToSeries } from "@/lib/wall-cover";
import type { WallItem, WallRenderTile } from "@/types/wall";
import { cn } from "@/lib/utils";

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

  // Le survol suit le curseur : la tuile s'incline et une lumière court sur
  // l'affiche. Les valeurs passent par des variables CSS, sans re-render.
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLAnchorElement>) => {
      if (event.pointerType !== "mouse") return;
      const element = event.currentTarget;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      element.style.setProperty("--wall-tilt-x", `${(-py * 6).toFixed(2)}deg`);
      element.style.setProperty("--wall-tilt-y", `${(px * 8).toFixed(2)}deg`);
      element.style.setProperty("--wall-pull-x", `${(px * 10).toFixed(2)}px`);
      element.style.setProperty("--wall-pull-y", `${(py * 8).toFixed(2)}px`);
      element.style.setProperty("--wall-light-x", `${((px + 0.5) * 100).toFixed(1)}%`);
      element.style.setProperty("--wall-light-y", `${((py + 0.5) * 100).toFixed(1)}%`);
    },
    []
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
      element.style.removeProperty("--wall-tilt-x");
      element.style.removeProperty("--wall-tilt-y");
      element.style.removeProperty("--wall-pull-x");
      element.style.removeProperty("--wall-pull-y");
      element.style.removeProperty("--wall-light-x");
      element.style.removeProperty("--wall-light-y");
      if (event.pointerType === "mouse") onHover(tile.key, false);
    },
    [onHover, tile.key]
  );

  return (
    <Link
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
      <div className="wall-tile-frame relative h-full w-full overflow-hidden bg-surface-2">
        <SeriesCover
          series={wallItemToSeries(item)}
          alt=""
          showProgressUi={false}
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
