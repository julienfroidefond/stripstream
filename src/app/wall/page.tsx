import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProvider } from "@/lib/providers/provider.factory";
import { getWallItems } from "@/lib/services/wall.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { AppError } from "@/utils/errors";
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
  // `redirect` lève une exception de contrôle : on garde le hors-try pour ne
  // jamais l'avaler dans le filet d'erreur du mur.
  const provider = await getProvider();
  if (!provider) redirect("/settings");

  try {
    const items = await getWallItems(provider);
    if (items.length === 0) return <WallEmpty />;

    return <WallExperience items={items} />;
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === ERROR_CODES.KOMGA.MISSING_CONFIG ||
        error.code === ERROR_CODES.STRIPSTREAM.MISSING_CONFIG)
    ) {
      redirect("/settings");
    }

    const code = error instanceof AppError ? error.code : ERROR_CODES.WALL.FETCH_ERROR;
    return <WallError code={code} />;
  }
}
