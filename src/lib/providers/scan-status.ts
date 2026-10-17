import type { ScanState } from "./types";

/**
 * Map a Librarian index-job status onto the reader's scan lifecycle.
 *
 * The Librarian reports intermediate phases (`extracting_pages`,
 * `generating_thumbnails`, …) that all mean "still running" for the reader.
 * Unknown values degrade to `unavailable` so the client stops polling instead
 * of spinning forever on a status it does not understand.
 */
export function scanStateFromIndexJobStatus(status: string | null | undefined): ScanState {
  switch ((status ?? "").trim().toLowerCase()) {
    case "pending":
    case "queued":
    case "running":
    case "processing":
    case "extracting_pages":
    case "generating_thumbnails":
      return "running";
    case "success":
    case "completed":
    case "done":
      return "completed";
    case "failed":
    case "error":
      return "failed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return "unavailable";
  }
}
