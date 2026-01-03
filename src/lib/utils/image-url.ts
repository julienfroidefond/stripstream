/**
 * Génère l'URL pour une image (thumbnail de série ou de livre)
 */
export function getImageUrl(type: "series" | "book", id: string) {
  if (type === "series") {
    return `/api/komga/images/series/${id}/thumbnail`;
  }
  return `/api/komga/images/books/${id}/thumbnail`;
}
