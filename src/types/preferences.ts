export type BackgroundType = "default" | "gradient" | "image";

export interface BackgroundPreferences {
  type: BackgroundType;
  gradient?: string;
  imageUrl?: string;
}

export interface UserPreferences {
  showThumbnails: boolean;
  cacheMode: "memory" | "file";
  showOnlyUnread: boolean;
  displayMode: {
    compact: boolean;
    itemsPerPage: number;
  };
  background: BackgroundPreferences;
}

export const defaultPreferences: UserPreferences = {
  showThumbnails: true,
  cacheMode: "memory",
  showOnlyUnread: false,
  displayMode: {
    compact: false,
    itemsPerPage: 20,
  },
  background: {
    type: "default",
  },
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
