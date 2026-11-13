import type { ProviderType } from "@/lib/providers/types";
import { CONNECTION_DESCRIPTORS, CONNECTION_PROVIDERS } from "./descriptors";
import type { ConnectionLists } from "./types";

/**
 * Vue client des connexions : une liste unique, tous providers confondus, que
 * le sélecteur de la sidebar et l'écran de réglages affichent de la même façon.
 * Module pur, sans import serveur.
 */
export interface UnifiedConnection {
  /** Clé stable `provider-id`, unique tous providers confondus. */
  key: string;
  provider: ProviderType;
  id: number;
  name: string;
  url: string;
  isActive: boolean;
  /**
   * Valeurs des champs non secrets du descripteur (ex. `username` Komga), pour
   * l'affichage et le préremplissage du formulaire d'édition.
   */
  fields: Record<string, string>;
}

export function connectionKey(connection: { provider: ProviderType; id: number }): string {
  return `${connection.provider}-${connection.id}`;
}

/** Fragment de `data-testid` dérivé du nom (`Stub A` → `stub-a`). */
export function connectionSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Fusionne les listes par provider dans l'ordre du registre, puis de création. */
export function toUnifiedConnections(lists: ConnectionLists): UnifiedConnection[] {
  return CONNECTION_PROVIDERS.flatMap((provider) => {
    const visibleFields = CONNECTION_DESCRIPTORS[provider].fields.filter(
      (field) => field.inputType !== "password"
    );
    const summaries: ReadonlyArray<ConnectionLists[ProviderType][number]> = lists[provider] ?? [];
    return summaries.map((summary) => {
      const values = summary as unknown as Record<string, unknown>;
      const fields: Record<string, string> = {};
      for (const field of visibleFields) {
        const value = values[field.name];
        if (typeof value === "string") fields[field.name] = value;
      }
      return {
        key: connectionKey({ provider, id: summary.id }),
        provider,
        id: summary.id,
        name: summary.name,
        url: summary.url,
        isActive: summary.isActive,
        fields,
      };
    });
  });
}

/** Listes vides, une par provider du registre (état de repli d'un écran). */
export function emptyConnectionLists(): ConnectionLists {
  // Une entrée par provider déclaré : l'objet a la forme de `ConnectionLists`.
  return Object.fromEntries(
    CONNECTION_PROVIDERS.map((provider) => [provider, []])
  ) as unknown as ConnectionLists;
}

/** Connexion active de la liste, s'il y en a une. */
export function findActiveConnection(
  connections: readonly UnifiedConnection[]
): UnifiedConnection | undefined {
  return connections.find((connection) => connection.isActive);
}
