import type { Prisma } from "@/generated/prisma/client";
import { normalizeDisplayMode } from "@/lib/preferences/display";
import {
  defaultPreferences,
  type BackgroundPreferences,
  type UserPreferences,
} from "@/types/preferences";

/**
 * Descripteur des préférences utilisateur.
 *
 * Une préférence = une colonne Prisma + une valeur par défaut + une lecture
 * normalisée + une écriture normalisée. Le service dérive la lecture, l'update
 * partiel et la création de ligne de cette table : ajouter une préférence se
 * fait ici, et le compilateur signale tout champ de `UserPreferences` oublié.
 */

export type PreferencesRow = Prisma.PreferencesGetPayload<object>;

/** Colonnes Prisma qui portent une préférence utilisateur. */
export type PreferenceColumn =
  | "showThumbnails"
  | "showOnlyUnread"
  | "anonymousMode"
  | "displayMode"
  | "background"
  | "readerPrefetchCount"
  | "readingDirection"
  | "readerBackground"
  | "readerDoublePageMode"
  | "readerPageTurn"
  | "defaultSortOrder"
  | "showMissingBooks"
  | "hideMissingBooks";

/** Valeur prête à être écrite dans une colonne de préférence. */
type ColumnValue = boolean | number | string | Prisma.InputJsonValue;

/** Colonnes d'une ligne de préférences, sans `userId` ni métadonnées. */
export type PreferenceColumns = Pick<Prisma.PreferencesUncheckedCreateInput, PreferenceColumn>;

interface PreferenceField<T> {
  /** Colonne Prisma qui stocke la préférence. */
  readonly column: PreferenceColumn;
  /** Valeur utilisée quand la colonne est absente ou nulle. */
  readonly defaultValue: T;
  /** Lit la colonne et complète ce qui manque avec les défauts. */
  readonly read: (row: PreferencesRow) => T;
  /** Normalise la valeur avant de l'écrire. */
  readonly write: (value: T) => ColumnValue;
}

/** La table doit couvrir exactement les clés de `UserPreferences`. */
type PreferenceFields = {
  readonly [K in keyof UserPreferences]: PreferenceField<UserPreferences[K]>;
};

function scalar<T extends boolean | number | string>(
  column: PreferenceColumn,
  defaultValue: T
): PreferenceField<T> {
  return {
    column,
    defaultValue,
    read: (row) => (row[column] as unknown as T | null) ?? defaultValue,
    write: (value) => value,
  };
}

function mergeBackground(
  value: Partial<BackgroundPreferences> | null | undefined
): BackgroundPreferences {
  return { ...defaultPreferences.background, ...(value ?? {}) };
}

const displayMode: PreferenceField<UserPreferences["displayMode"]> = {
  column: "displayMode",
  defaultValue: defaultPreferences.displayMode,
  read: (row) =>
    normalizeDisplayMode(
      row.displayMode as unknown as Partial<UserPreferences["displayMode"]> | null
    ),
  write: (value) =>
    normalizeDisplayMode(value) as unknown as Prisma.InputJsonValue,
};

const background: PreferenceField<UserPreferences["background"]> = {
  column: "background",
  defaultValue: defaultPreferences.background,
  read: (row) =>
    mergeBackground(row.background as unknown as Partial<BackgroundPreferences> | null),
  write: (value) => mergeBackground(value) as unknown as Prisma.InputJsonValue,
};

export const preferenceFields: PreferenceFields = {
  showThumbnails: scalar("showThumbnails", defaultPreferences.showThumbnails),
  showOnlyUnread: scalar("showOnlyUnread", defaultPreferences.showOnlyUnread),
  anonymousMode: scalar("anonymousMode", defaultPreferences.anonymousMode),
  displayMode,
  background,
  readerPrefetchCount: scalar("readerPrefetchCount", defaultPreferences.readerPrefetchCount),
  readingDirection: scalar("readingDirection", defaultPreferences.readingDirection),
  readerBackground: scalar("readerBackground", defaultPreferences.readerBackground),
  readerDoublePageMode: scalar(
    "readerDoublePageMode",
    defaultPreferences.readerDoublePageMode
  ),
  readerPageTurn: scalar("readerPageTurn", defaultPreferences.readerPageTurn),
  defaultSortOrder: scalar("defaultSortOrder", defaultPreferences.defaultSortOrder),
  showMissingBooks: scalar("showMissingBooks", defaultPreferences.showMissingBooks),
  hideMissingBooks: scalar("hideMissingBooks", defaultPreferences.hideMissingBooks),
};

function fields(): Array<[keyof UserPreferences, PreferenceField<unknown>]> {
  return Object.entries(preferenceFields) as unknown as Array<
    [keyof UserPreferences, PreferenceField<unknown>]
  >;
}

/** Compose un `UserPreferences` complet à partir d'une ligne Prisma. */
export function readPreferences(row: PreferencesRow | null): UserPreferences {
  const preferences = {} as UserPreferences;

  for (const [key, field] of fields()) {
    const value = row ? field.read(row) : field.defaultValue;
    (preferences as Record<keyof UserPreferences, unknown>)[key] = value;
  }

  return preferences;
}

/**
 * Colonnes à écrire pour un patch : les clés absentes ne sont pas incluses,
 * donc un update partiel ne réécrit jamais les colonnes qu'il ne vise pas.
 */
export function preferencePatchToColumns(
  patch: Partial<UserPreferences>
): Partial<PreferenceColumns> {
  const columns: Partial<Record<PreferenceColumn, ColumnValue>> = {};

  for (const [key, field] of fields()) {
    if (patch[key] !== undefined) {
      columns[field.column] = field.write(patch[key]);
    }
  }

  return columns as Partial<PreferenceColumns>;
}

/** Ligne complète à créer : chaque colonne reçoit le patch ou son défaut. */
export function preferenceCreateColumns(
  overrides: Partial<UserPreferences> = {}
): PreferenceColumns {
  const columns: Partial<Record<PreferenceColumn, ColumnValue>> = {};

  for (const [key, field] of fields()) {
    columns[field.column] = field.write(overrides[key] ?? field.defaultValue);
  }

  return columns as PreferenceColumns;
}
