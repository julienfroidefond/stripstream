import type { ErrorCode } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";

/**
 * Une connexion résolue contient tout ce qu'il faut pour parler au backend,
 * credentials déchiffrés compris. Elle ne sort jamais vers le client : les
 * Server Components et les routes la consomment côté serveur uniquement.
 */
export interface KomgaConnection {
  provider: "komga";
  /** `null` pour une connexion ad hoc (test de credentials non enregistrés). */
  configId: number | null;
  url: string;
  /** Valeur Basic (`base64("user:password")`), sans le préfixe `Basic `. */
  authHeader: string;
}

export interface StripstreamConnection {
  provider: "stripstream";
  /** `null` pour un test ad hoc. */
  configId: number | null;
  url: string;
  token: string;
  source: "db" | "provided";
}

export type ResolvedConnection = KomgaConnection | StripstreamConnection;

/** Connexion résolue d'un provider précis. */
export type ConnectionOf<P extends ProviderType> = Extract<ResolvedConnection, { provider: P }>;

export interface ConnectionSummaryBase {
  id: number;
  name: string;
  url: string;
  isActive: boolean;
}

export interface KomgaConnectionSummary extends ConnectionSummaryBase {
  username: string;
}

export type StripstreamConnectionSummary = ConnectionSummaryBase;

/** Configs enregistrées, une liste par provider (forme sérialisable vers le client). */
export interface ConnectionLists {
  komga: KomgaConnectionSummary[];
  stripstream: StripstreamConnectionSummary[];
}

export type ConnectionSummaryOf<P extends ProviderType> = ConnectionLists[P][number];

/**
 * Saisie d'une connexion, discriminée par `provider`. Les champs propres à un
 * provider (identifiant/mot de passe, token) sont décrits par son descripteur
 * (`descriptors.ts`), qui porte aussi les règles de validation.
 *
 * Sans `id` : création. Avec `id` : mise à jour ; un secret vide conserve la
 * valeur enregistrée.
 */
export type ConnectionInput =
  | {
      provider: "komga";
      id?: number;
      name: string;
      url: string;
      username: string;
      password?: string;
    }
  | {
      provider: "stripstream";
      id?: number;
      name: string;
      url: string;
      token?: string;
    };

export type ConnectionInputOf<P extends ProviderType> = Extract<ConnectionInput, { provider: P }>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Credentials pas encore enregistrés, pour « tester avant de sauvegarder » :
 * la saisie sans `id` ni `name`, tous les secrets étant alors requis.
 */
export type ConnectionDraft = DistributiveOmit<ConnectionInput, "id" | "name">;

export type ConnectionDraftOf<P extends ProviderType> = Extract<ConnectionDraft, { provider: P }>;

/** Référence d'une config enregistrée. */
export interface ConnectionRef {
  provider: ProviderType;
  id: number;
}

/** Cible d'un test : une config enregistrée ou des credentials saisis. */
export type ConnectionTestTarget = { stored: ConnectionRef } | { draft: ConnectionDraft };

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  /** Code catalogue de l'échec provider, quand le provider en fournit un. */
  code?: ErrorCode;
  libraryCount?: number;
}

export interface ConnectionTestRateLimit {
  allowed: boolean;
  retryAfterSeconds: number;
}

export type ConnectionProvider = ProviderType;
