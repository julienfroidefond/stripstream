import type { Metadata } from "next";

import { getWallItems } from "@/lib/services/wall.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { SurfaceBoundary } from "@/components/ui/SurfaceBoundary";
import { loadSurface } from "@/lib/surfaces/load-surface";
import { WallExperience } from "@/components/wall/WallExperience";
import { WallEmpty } from "@/components/wall/WallEmpty";
import { WallError } from "@/components/wall/WallError";

export const metadata: Metadata = {
  title: "Le Wall",
  description: "Toutes les couvertures de votre bibliothèque, sur un seul mur.",
};

/**
 * Le Wall — vue plein cadre.
 *
 * La page ne rend qu'une chose : le mur. La collecte se fait ici ; la
 * géométrie est recalculée côté client à partir des séries visibles, pour que
 * les filtres puissent redessiner le mur sans rechargement.
 */
export default async function WallPage() {
  const surface = await loadSurface({
    name: "wall",
    fallbackCode: ERROR_CODES.WALL.FETCH_ERROR,
    load: ({ provider }) => getWallItems(provider),
  });

  return (
    <SurfaceBoundary
      surface={surface}
      error={(code) => <WallError code={code} />}
      ready={(items) =>
        items.length === 0 ? <WallEmpty /> : <WallExperience items={items} />
      }
    />
  );
}
