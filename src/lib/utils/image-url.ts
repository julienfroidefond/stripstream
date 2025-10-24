/**
 * Génère l'URL de base pour une image (sans cache version)
 * Utilisez useImageUrl() dans les composants pour obtenir l'URL avec cache busting
 */
export function getImageUrl(type: "series" | "book", id: string) {
  if (type === "series") {
    return `/api/komga/images/series/${id}/thumbnail`;
  }
  return `/api/komga/images/books/${id}/thumbnail`;
}

