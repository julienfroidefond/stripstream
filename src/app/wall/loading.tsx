import { WallFrame } from "@/components/wall/WallFrame";
import {
  WALL_PATCH_HEIGHT,
  WALL_PATCH_WIDTH,
  buildWallLayout,
} from "@/lib/wall-layout";

const percentOf = (value: number, total: number) =>
  `${((value / total) * 100).toFixed(4)}%`;

/**
 * Le cadre s'affiche immédiatement, les œuvres arrivent ensuite. La silhouette
 * reprend le motif réel du mur (mêmes cellules, mêmes gouttières, mêmes tailles
 * 1×, 2× et 3×) : les couvertures remplacent les blocs sans déplacer la grille.
 * Le motif est exprimé en pourcentages et cadré par la feuille de style à
 * l'échelle d'ouverture du mur. Pas de faux titre : le vrai prend sa place dès
 * que le mur est là.
 */
export default function WallLoading() {
  const layout = buildWallLayout("all");

  return (
    <WallFrame>
      <div className="absolute inset-0 overflow-hidden">
        <div className="wall-skeleton-stage absolute left-1/2 top-1/2">
          {layout.tiles.map((tile) => (
            <div
              key={tile.index}
              className="wall-skeleton-cover absolute"
              style={{
                left: percentOf(tile.x, WALL_PATCH_WIDTH),
                top: percentOf(tile.y, WALL_PATCH_HEIGHT),
                width: percentOf(tile.width, WALL_PATCH_WIDTH),
                height: percentOf(tile.height, WALL_PATCH_HEIGHT),
                animationDelay: `${(tile.order % 14) * 70}ms`,
              }}
            />
          ))}
        </div>

        <div
          className="wall-vignette pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div
          className="wall-bottom-fade pointer-events-none absolute inset-x-0 bottom-0 z-10"
          aria-hidden
        />

        {/* Les deux groupes d'actions du mur, à leur place réelle. */}
        <div className="wall-skeleton absolute bottom-4 left-4 z-20 h-10 w-28 rounded-full sm:bottom-6 sm:left-6" />
        <div className="wall-skeleton absolute bottom-4 right-4 z-20 h-10 w-64 rounded-full sm:bottom-6 sm:right-6" />
      </div>
    </WallFrame>
  );
}
