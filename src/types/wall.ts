/**
 * Le Wall — données et géométrie du mur de couvertures.
 *
 * Le serveur ne transmet au client que ce que la plaque affiche : une
 * couverture, un titre, un résumé et la progression. La géométrie est un
 * motif périodique calculé côté client : le mur peut ainsi défiler sans fin
 * sans jamais dupliquer les données.
 */

export interface WallItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  summary: string | null;
  authors: string[];
  genres: string[];
  libraryName: string;
  bookCount: number;
  booksReadCount: number;
  startYear: number | null;
  seriesStatus: string | null;
  missingCount: number | null;
  communityScore: number | null;
}

/**
 * Position d'une œuvre dans le motif, en pixels du repère non transformé.
 * `index` est le rang de la tuile dans le motif ; `order` donne le rang de
 * pose et sert à la cascade d'entrée.
 */
export interface WallTile {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  order: number;
}

/**
 * Une copie concrète du motif, prête à être rendue.
 * `key` identifie la copie (elle reste stable pendant le défilement) et
 * `itemIndex` désigne la série réellement affichée. `visible` indique que la
 * tuile croise le cadre (les autres forment la marge de préchargement).
 */
export interface WallRenderTile extends WallTile {
  key: string;
  itemIndex: number;
  visible: boolean;
}

export interface WallLayout {
  width: number;
  height: number;
  tiles: WallTile[];
}

/**
 * Rectangle exprimé dans le repère du cadre du mur. Il sert à faire voler
 * l'aperçu depuis sa tuile jusqu'au centre de la salle.
 */
export interface WallRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
