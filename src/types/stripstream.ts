// Types natifs de l'API Stripstream Librarian

export interface StripstreamBookItem {
  id: string;
  library_id: string;
  kind: string;
  title: string;
  updated_at: string;
  reading_status: "unread" | "reading" | "read";
  volume_type: string;
  author?: string | null;
  language?: string | null;
  page_count?: number | null;
  reading_current_page?: number | null;
  reading_last_read_at?: string | null;
  series?: string | null;
  series_id?: string | null;
  thumbnail_url?: string | null;
  volume?: number | null;
}

export interface StripstreamBookDetails {
  id: string;
  library_id: string;
  kind: string;
  title: string;
  reading_status: "unread" | "reading" | "read";
  volume_type: string;
  author?: string | null;
  file_format?: string | null;
  file_parse_status?: string | null;
  file_path?: string | null;
  language?: string | null;
  page_count?: number | null;
  reading_current_page?: number | null;
  reading_last_read_at?: string | null;
  series?: string | null;
  /** UUID of the parent series (only present in details, not in list items). */
  series_id?: string | null;
  /** Per-book summary; usually richer than the series summary. */
  summary?: string | null;
  thumbnail_url?: string | null;
  volume?: number | null;
}

export interface StripstreamBooksPage {
  items: StripstreamBookItem[];
  total: number;
  page: number;
  limit: number;
}

export interface StripstreamSeriesItem {
  series_id: string;
  name: string;
  book_count: number;
  books_read_count: number;
  first_book_id: string | null;
  first_book_updated_at?: string | null;
  library_id: string;
  missing_count?: number | null;
  anilist_id?: number | null;
  anilist_url?: string | null;
  metadata_provider?: string | null;
  series_status?: string | null;
  cover_url?: string | null;
  genres?: string[] | null;
  authors?: string[] | null;
  description?: string | null;
  start_year?: number | null;
  /**
   * Aggregate community rating on the 0-5 scale — average of approved providers
   * (`provider_rating / provider_rating_scale * 5`). Displayed as /10 by doubling.
   */
  community_score?: number | null;
  /** Current user's own half-star rating (1-10), null when unrated. */
  user_rating?: number | null;
}

export interface StripstreamSeriesLookup {
  id: string;
  library_id: string;
  name: string;
}

export interface StripstreamSeriesPage {
  items: StripstreamSeriesItem[];
  total: number;
  page: number;
  limit: number;
}

export interface StripstreamLibraryResponse {
  id: string;
  name: string;
  root_path: string;
  enabled: boolean;
  book_count: number;
  monitor_enabled: boolean;
  scan_mode: string;
  watcher_enabled: boolean;
  next_scan_at?: string | null;
}

export interface StripstreamReadingProgressResponse {
  status: "unread" | "reading" | "read";
  current_page?: number | null;
  last_read_at?: string | null;
}

export interface StripstreamUpdateReadingProgressRequest {
  status: "unread" | "reading" | "read";
  current_page?: number | null;
}

export interface StripstreamProviderRating {
  provider: string;
  rating: number;
  rating_scale: number;
  rating_count: number | null;
}

export interface StripstreamSeriesRatingsResponse {
  user_rating: number | null;
  anilist_pulled_rating: number | null;
  provider_ratings: StripstreamProviderRating[];
}

export interface StripstreamSeriesMetadata {
  authors: string[];
  genres: string[];
  publishers: string[];
  description?: string | null;
  start_year?: number | null;
  book_author?: string | null;
  book_language?: string | null;
}

export interface StripstreamMetadataLink {
  id: string;
  series_name: string;
  provider: string;
  external_id: string;
  status: string;
  metadata_json: unknown;
  synced_at?: string | null;
  total_volumes_external?: number | null;
}

export interface StripstreamMissingBook {
  title: string;
  volume_number: number;
  external_book_id?: string | null;
  cover_url?: string | null;
}

export interface StripstreamMissingBooksDto {
  total_external: number;
  total_local: number;
  missing_count: number;
  missing_books: StripstreamMissingBook[];
}

export interface StripstreamSearchResponse {
  hits: StripstreamSearchHit[];
  series_hits: StripstreamSeriesHit[];
  estimated_total_hits?: number | null;
  processing_time_ms?: number | null;
}

export interface StripstreamRecommendedSeriesItem {
  series_id: string;
  name: string;
  library_id: string;
  book_count: number;
  score: number;
  because_of: string[];
  match_reasons: string[];
  first_book_id?: string | null;
  series_status?: string | null;
  cover_url?: string | null;
  metadata_provider?: string | null;
  first_book_updated_at?: string | null;
  description: string | null;
  authors: string[];
  genres: string[];
  start_year?: number | null;
}

export interface StripstreamRelatedSeriesItem {
  series_id: string;
  name: string;
  book_count: number;
  books_read_count: number;
  library_id: string;
  score: number;
  match_reasons: string[];
  first_book_id?: string | null;
  series_status?: string | null;
  cover_url?: string | null;
  metadata_provider?: string | null;
  first_book_updated_at?: string | null;
  start_year?: number | null;
}

export interface StripstreamSearchHit {
  id: string;
  title: string;
  series?: string | null;
  library_id: string;
  thumbnail_url?: string | null;
  volume?: number | null;
}

export interface StripstreamSeriesHit {
  name: string;
  book_count: number;
  books_read_count: number;
  first_book_id: string;
  library_id: string;
}

export interface StripstreamReadingList {
  id: string;
  name: string;
  description: string | null;
  series_count: number;
  preview_covers: string[];
  created_at: string;
  updated_at: string;
}

export interface StripstreamReadingListItem {
  id: string;
  name: string;
  cover_url: string | null;
  first_book_id: string | null;
  library_id: string;
  library_name: string;
  position: number;
}

export interface StripstreamReadingListDetail {
  id: string;
  name: string;
  description: string | null;
  items: StripstreamReadingListItem[];
  created_at: string;
  updated_at: string;
}
