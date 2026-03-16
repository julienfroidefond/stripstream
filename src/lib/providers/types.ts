export type ProviderType = "komga" | "stripstream";

export interface NormalizedReadProgress {
  page: number | null;
  completed: boolean;
  lastReadAt: string | null;
}

export interface NormalizedLibrary {
  id: string;
  name: string;
  bookCount: number;
}

export interface NormalizedSeries {
  id: string;
  name: string;
  bookCount: number;
  booksReadCount: number;
  thumbnailUrl: string;
  libraryId?: string;
  // Optional metadata (Komga-rich, Stripstream-sparse)
  summary?: string | null;
  authors?: Array<{ name: string; role: string }>;
  genres?: string[];
  tags?: string[];
  createdAt?: string | null;
}

export interface NormalizedBook {
  id: string;
  libraryId: string;
  title: string;
  number: string | null;
  seriesId: string | null;
  volume: number | null;
  pageCount: number;
  thumbnailUrl: string;
  readProgress: NormalizedReadProgress | null;
}

export interface NormalizedSearchResult {
  id: string;
  title: string;
  seriesTitle?: string | null;
  seriesId?: string | null;
  href: string;
  coverUrl: string;
  type: "series" | "book";
  bookCount?: number;
}

export interface NormalizedSeriesPage {
  items: NormalizedSeries[];
  nextCursor: string | null;
  totalPages?: number;
  totalElements?: number;
}

export interface NormalizedBooksPage {
  items: NormalizedBook[];
  nextCursor: string | null;
  totalPages?: number;
  totalElements?: number;
}
