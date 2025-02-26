export interface KomgaUser {
  id: string;
  email: string;
  roles: KomgaRole[];
  sharedAllLibraries: boolean;
  sharedLibrariesIds: string[];
  authenticated: boolean;
  authorities: string[];
}

export type KomgaRole = "ROLE_ADMIN" | "ROLE_USER";

export interface KomgaLibrary {
  id: string;
  name: string;
  root: string;
  importLastModified: string;
  lastModified: string;
  unavailable: boolean;
  booksCount: number;
  booksReadCount: number;
}

export interface KomgaSeries {
  id: string;
  libraryId: string;
  name: string;
  url: string;
  created: string;
  lastModified: string;
  fileLastModified: string;
  booksCount: number;
  booksReadCount: number;
  booksUnreadCount: number;
  booksInProgressCount: number;
  metadata: SeriesMetadata;
  booksMetadata: BooksMetadata;
  deleted: boolean;
  oneshot: boolean;
  favorite: boolean;
}

export interface SeriesMetadata {
  status: "ENDED" | "ONGOING" | "ABANDONED" | "HIATUS";
  title: string;
  titleSort: string;
  summary: string;
  publisher: string;
  readingDirection: "LEFT_TO_RIGHT" | "RIGHT_TO_LEFT" | "VERTICAL" | "WEBTOON";
  ageRating: number | null;
  language: string;
  genres: string[];
  tags: string[];
}

export interface BooksMetadata {
  created: string;
  lastModified: string;
  authors: Author[];
}

export interface Author {
  name: string;
  role: string;
}

export interface ReadProgress {
  page: number;
  completed: boolean;
  readDate: string | null;
  created: string;
  lastModified: string;
  deviceId?: string;
  deviceName?: string;
}

export interface KomgaBook {
  id: string;
  seriesId: string;
  seriesTitle: string;
  name: string;
  url: string;
  number: number;
  created: string;
  lastModified: string;
  fileLastModified: string;
  sizeBytes: number;
  size: string;
  media: BookMedia;
  metadata: BookMetadata;
  readProgress: ReadProgress | null;
}

export interface BookMedia {
  status: "READY" | "UNKNOWN" | "ERROR";
  mediaType: string;
  pagesCount: number;
}

export interface BookMetadata {
  title: string;
  titleSort: string;
  summary: string;
  number: string;
  authors: Author[];
  tags: string[];
  releaseDate: string;
  isbn: string;
}
