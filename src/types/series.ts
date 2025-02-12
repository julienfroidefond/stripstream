export interface Series {
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
  metadata: {
    status: string;
    created: string;
    lastModified: string;
    title: string;
    titleSort: string;
    summary: string;
    readingDirection: string;
    publisher: string;
    ageRating: number;
    language: string;
    genres: string[];
    tags: string[];
    totalBookCount: number;
    sharingLabels: string[];
    links: Array<{
      label: string;
      url: string;
    }>;
    alternateTitles: string[];
  };
  booksMetadata: {
    status: string;
    created: string;
    lastModified: string;
    title: string;
    titleSort: string;
    summary: string;
    number: string;
    numberSort: number;
    releaseDate: string;
    authors: Array<{
      name: string;
      role: string;
    }>;
  };
  deleted: boolean;
}
