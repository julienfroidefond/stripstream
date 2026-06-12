export type BackgroundType = "default" | "gradient" | "image" | "komga-random";

export interface BackgroundPreferences {
  type: BackgroundType;
  gradient?: string;
  imageUrl?: string;
  opacity?: number; // 0-100
  blur?: number; // 0-20 (px)
  komgaLibraries?: string[]; // IDs des bibliothèques Komga sélectionnées
}

export type FitMode = "fit" | "width" | "height" | "original";
export type ReadingDirection = "ltr" | "rtl";
export type SortOrder = "title" | "latest";

export interface UserPreferences {
  showThumbnails: boolean;
  showOnlyUnread: boolean;
  anonymousMode: boolean;
  displayMode: {
    compact: boolean;
    itemsPerPage: number;
    viewMode: "grid" | "list";
  };
  background: BackgroundPreferences;
  readerPrefetchCount: number;
  readingDirection: ReadingDirection;
  readerFitMode: FitMode;
  readerDoublePageMode: boolean;
  defaultSortOrder: SortOrder;
  showMissingBooks: boolean;
  hideMissingBooks: boolean;
}

export const defaultPreferences: UserPreferences = {
  showThumbnails: true,
  showOnlyUnread: false,
  anonymousMode: false,
  displayMode: {
    compact: false,
    itemsPerPage: 30,
    viewMode: "grid",
  },
  background: {
    type: "default",
    opacity: 10,
    blur: 0,
  },
  readerPrefetchCount: 5,
  readingDirection: "ltr",
  readerFitMode: "fit",
  readerDoublePageMode: false,
  defaultSortOrder: "title",
  showMissingBooks: true,
  hideMissingBooks: false,
};

// Dégradés prédéfinis
export const GRADIENT_PRESETS = [
  {
    id: "indigo-purple",
    name: "Indigo Purple",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "blue-teal",
    name: "Blue Teal",
    gradient: "linear-gradient(135deg, #0093E9 0%, #80D0C7 100%)",
  },
  {
    id: "pink-orange",
    name: "Pink Orange",
    gradient: "linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)",
  },
  {
    id: "purple-pink",
    name: "Purple Pink",
    gradient: "linear-gradient(135deg, #A8EDEA 0%, #FED6E3 100%)",
  },
  {
    id: "dark-blue",
    name: "Dark Blue",
    gradient: "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)",
  },
  {
    id: "sunset",
    name: "Sunset",
    gradient: "linear-gradient(135deg, #FF512F 0%, #DD2476 100%)",
  },
  {
    id: "ocean",
    name: "Ocean",
    gradient: "linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)",
  },
  {
    id: "forest",
    name: "Forest",
    gradient: "linear-gradient(135deg, #134E5E 0%, #71B280 100%)",
  },
] as const;
