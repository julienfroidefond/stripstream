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
  /** `null` pour une config d'environnement ou un test ad hoc. */
  configId: number | null;
  url: string;
  token: string;
  source: "db" | "env" | "provided";
}

export type ResolvedConnection = KomgaConnection | StripstreamConnection;

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

export interface ConnectionLists {
  komga: KomgaConnectionSummary[];
  stripstream: StripstreamConnectionSummary[];
}

export type SaveConnectionInput =
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

export interface ConnectionTestResult {
  ok: boolean;
  error?: string;
  libraryCount?: number;
}

export interface ConnectionTestRateLimit {
  allowed: boolean;
  retryAfterSeconds: number;
}

export type ConnectionProvider = ProviderType;
