export interface UserPreferences {
  showThumbnails: boolean;
  cacheMode: "memory" | "file";
  showOnlyUnread: boolean;
  debug: boolean;
  displayMode: {
    compact: boolean;
    itemsPerPage: number;
  };
}

export const defaultPreferences: UserPreferences = {
  showThumbnails: true,
  cacheMode: "memory",
  showOnlyUnread: false,
  debug: false,
  displayMode: {
    compact: false,
    itemsPerPage: 20,
  },
} as const;
