import type { StripstreamMetadataLink } from "@/types/stripstream";

/**
 * Picks the approved metadata link used to compute a series' missing books.
 *
 * Librarian can expose several approved links per series (primary provider +
 * secondary auto-matched provider). Its own endpoints always resolve the
 * primary one first:
 *
 *   ORDER BY is_primary DESC, approved_at ASC NULLS LAST, id ASC
 *
 * `GET /metadata/links` already returns links in a stable order, but not
 * `is_primary` first. Selecting the first approved link blindly can therefore
 * read another edition's metadata and surface volumes that are not part of the
 * Librarian series (#76).
 */
export function selectApprovedMetadataLink(
  links: StripstreamMetadataLink[]
): StripstreamMetadataLink | undefined {
  const approved = links.filter((link) => link.status === "approved");
  return approved.find((link) => link.is_primary === true) ?? approved[0];
}
