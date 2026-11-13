import prisma from "@/lib/prisma";
import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
import { buildKomgaAuthHeader, decryptSecret, encryptSecret } from "@/lib/credentials";
import type { MediaTransport } from "@/lib/media/types";
import type { IMediaProvider } from "@/lib/providers/provider.interface";
import type { ProviderType } from "@/lib/providers/types";
import { normalizeServerUrl } from "@/utils/server-url";
import { CONNECTION_DESCRIPTORS, type ConnectionDescriptor } from "./descriptors";
import type {
  ConnectionDraftOf,
  ConnectionInputOf,
  ConnectionOf,
  ConnectionSummaryOf,
  ResolvedConnection,
} from "./types";

/**
 * Registre des providers de connexion : tout ce qui varie d'un type de
 * provider à l'autre pour enregistrer, résoudre, tester et servir une
 * connexion. `resolve`, `manage`, `probe`, `active`, la factory de providers et
 * le transport média consomment une `ProviderDefinition` au lieu de brancher
 * sur `provider === "…"` (ADR 0030). Ajouter un provider = une définition ici,
 * un descripteur dans `descriptors.ts` et ses types dans `types.ts`.
 */

/** Ligne enregistrée réduite à ce que la résolution consomme ; `secret` est chiffré. */
export interface StoredConnectionRow {
  id: number;
  url: string;
  secret: string;
}

/** Accès Prisma d'un provider : seul endroit qui nomme sa table et ses colonnes. */
export interface ConnectionStore<P extends ProviderType> {
  /** Config exacte possédée par le user, secret chiffré compris. */
  findOwned(userId: number, id: number): Promise<StoredConnectionRow | null>;
  /** Première config du user (ordre de création). */
  findFirst(userId: number): Promise<StoredConnectionRow | null>;
  /** Existence et nom d'une config possédée, sans lire le secret. */
  findLabel(userId: number, id: number): Promise<{ id: number; name: string } | null>;
  list(userId: number): Promise<Omit<ConnectionSummaryOf<P>, "isActive">[]>;
  create(userId: number, input: ConnectionInputOf<P>, secret: string): Promise<{ id: number }>;
  update(id: number, input: ConnectionInputOf<P>, secret: string): Promise<void>;
  remove(id: number): Promise<void>;
}

/*
 * `ProviderDefinition<P>` est typée finement pour écrire chaque définition ;
 * `ProviderDefinition` (sans paramètre) est la vue « une définition de
 * provider », dont les méthodes acceptent l'union des connexions/saisies. Le
 * passage de l'une à l'autre (`widen`) est le seul cast du registre : il est
 * sûr parce que la définition est toujours choisie par le `provider` de la
 * valeur qu'on lui passe (`definitionFor`).
 */
export interface ProviderDefinition<P extends ProviderType = ProviderType> {
  readonly provider: P;
  /** Libellés et champs de saisie, partagés avec le client. */
  readonly descriptor: ConnectionDescriptor<P>;
  /** Code levé quand une route média n'a aucune connexion de ce provider. */
  readonly missingConfigCode: ErrorCode;
  readonly store: ConnectionStore<P>;
  /** Ligne enregistrée → connexion résolue (déchiffre le secret). */
  toConnection(row: StoredConnectionRow): ConnectionOf<P>;
  /** Connexion de dernier recours issue de l'environnement, ou `null`. */
  environmentConnection(): ConnectionOf<P> | null;
  /** Credentials saisis mais pas enregistrés → connexion ad hoc à tester. */
  draftConnection(draft: ConnectionDraftOf<P>): ConnectionOf<P>;
  /**
   * Secret chiffré à enregistrer pour une saisie validée. Sans nouveau secret,
   * renvoie `existingSecret` (mise à jour) ; `null` si aucun n'est disponible.
   */
  encodeSecret(input: ConnectionInputOf<P>, existingSecret: string | null): string | null;
  /** Fabrique le provider métier (import paresseux de son implémentation). */
  createProvider(connection: ConnectionOf<P>): Promise<IMediaProvider>;
  /** Charge le transport média du provider (import paresseux, évite les cycles). */
  loadMediaTransport(): Promise<MediaTransport>;
}

const KOMGA_SELECT = { id: true, url: true, authHeader: true } as const;
const STRIPSTREAM_SELECT = { id: true, url: true, token: true } as const;
const LABEL_SELECT = { id: true, name: true } as const;
const FIRST = { createdAt: "asc" } as const;

function komgaRow(row: { id: number; url: string; authHeader: string } | null) {
  return row ? { id: row.id, url: row.url, secret: row.authHeader } : null;
}

function stripstreamRow(row: { id: number; url: string; token: string } | null) {
  return row ? { id: row.id, url: row.url, secret: row.token } : null;
}

const komgaDefinition: ProviderDefinition<"komga"> = {
  provider: "komga",
  descriptor: CONNECTION_DESCRIPTORS.komga,
  missingConfigCode: ERROR_CODES.KOMGA.MISSING_CONFIG,
  store: {
    async findOwned(userId, id) {
      return komgaRow(
        await prisma.komgaConfig.findFirst({ where: { id, userId }, select: KOMGA_SELECT })
      );
    },
    async findFirst(userId) {
      return komgaRow(
        await prisma.komgaConfig.findFirst({
          where: { userId },
          orderBy: FIRST,
          select: KOMGA_SELECT,
        })
      );
    },
    findLabel(userId, id) {
      return prisma.komgaConfig.findFirst({ where: { id, userId }, select: LABEL_SELECT });
    },
    list(userId) {
      return prisma.komgaConfig.findMany({
        where: { userId },
        orderBy: FIRST,
        select: { id: true, name: true, url: true, username: true },
      });
    },
    create(userId, input, secret) {
      return prisma.komgaConfig.create({
        data: {
          userId,
          name: input.name,
          url: input.url,
          username: input.username,
          authHeader: secret,
        },
      });
    },
    async update(id, input, secret) {
      await prisma.komgaConfig.update({
        where: { id },
        data: { name: input.name, url: input.url, username: input.username, authHeader: secret },
      });
    },
    async remove(id) {
      await prisma.komgaConfig.delete({ where: { id } });
    },
  },
  toConnection(row) {
    return {
      provider: "komga",
      configId: row.id,
      url: row.url,
      authHeader: decryptSecret(row.secret),
    };
  },
  environmentConnection() {
    return null;
  },
  draftConnection(draft) {
    return {
      provider: "komga",
      configId: null,
      url: normalizeServerUrl(draft.url),
      authHeader: buildKomgaAuthHeader(draft.username, draft.password ?? ""),
    };
  },
  encodeSecret(input, existingSecret) {
    // Le secret Komga est la valeur Basic complète : un changement d'identifiant
    // sans nouveau mot de passe conserve l'ancienne valeur (comportement historique).
    return input.password
      ? encryptSecret(buildKomgaAuthHeader(input.username, input.password))
      : existingSecret;
  },
  async createProvider(connection) {
    const { KomgaProvider } = await import("@/lib/providers/komga/komga.provider");
    return new KomgaProvider(connection.url, connection.authHeader);
  },
  async loadMediaTransport() {
    return (await import("@/lib/media/komga.transport")).komgaMediaTransport;
  },
};

const stripstreamDefinition: ProviderDefinition<"stripstream"> = {
  provider: "stripstream",
  descriptor: CONNECTION_DESCRIPTORS.stripstream,
  missingConfigCode: ERROR_CODES.STRIPSTREAM.MISSING_CONFIG,
  store: {
    async findOwned(userId, id) {
      return stripstreamRow(
        await prisma.stripstreamConfig.findFirst({
          where: { id, userId },
          select: STRIPSTREAM_SELECT,
        })
      );
    },
    async findFirst(userId) {
      return stripstreamRow(
        await prisma.stripstreamConfig.findFirst({
          where: { userId },
          orderBy: FIRST,
          select: STRIPSTREAM_SELECT,
        })
      );
    },
    findLabel(userId, id) {
      return prisma.stripstreamConfig.findFirst({ where: { id, userId }, select: LABEL_SELECT });
    },
    list(userId) {
      return prisma.stripstreamConfig.findMany({
        where: { userId },
        orderBy: FIRST,
        select: { id: true, name: true, url: true },
      });
    },
    create(userId, input, secret) {
      return prisma.stripstreamConfig.create({
        data: { userId, name: input.name, url: input.url, token: secret },
      });
    },
    async update(id, input, secret) {
      await prisma.stripstreamConfig.update({
        where: { id },
        data: { name: input.name, url: input.url, token: secret },
      });
    },
    async remove(id) {
      await prisma.stripstreamConfig.delete({ where: { id } });
    },
  },
  toConnection(row) {
    return {
      provider: "stripstream",
      configId: row.id,
      url: row.url,
      token: decryptSecret(row.secret),
      source: "db",
    };
  },
  environmentConnection() {
    const url = process.env.STRIPSTREAM_URL?.trim();
    const token = process.env.STRIPSTREAM_TOKEN?.trim();
    return url && token
      ? { provider: "stripstream", configId: null, url, token, source: "env" }
      : null;
  },
  draftConnection(draft) {
    return {
      provider: "stripstream",
      configId: null,
      url: normalizeServerUrl(draft.url),
      token: (draft.token ?? "").trim(),
      source: "provided",
    };
  },
  encodeSecret(input, existingSecret) {
    const token = input.token?.trim();
    return token ? encryptSecret(token) : existingSecret;
  },
  async createProvider(connection) {
    const { StripstreamProvider } = await import(
      "@/lib/providers/stripstream/stripstream.provider"
    );
    return new StripstreamProvider(connection.url, connection.token);
  },
  async loadMediaTransport() {
    return (await import("@/lib/media/stripstream.transport")).stripstreamMediaTransport;
  },
};

/**
 * Une définition par provider. Le type mappé rend le registre exhaustif : un
 * nouveau `ProviderType` sans définition ne compile pas.
 */
export const PROVIDER_DEFINITIONS: { readonly [P in ProviderType]: ProviderDefinition<P> } = {
  komga: komgaDefinition,
  stripstream: stripstreamDefinition,
};

/**
 * Vue générique d'une définition. TypeScript ne sait pas prouver qu'une
 * définition de `"komga"` accepte « une connexion quelconque » ; l'invariant
 * est tenu par les appelants, qui choisissent la définition par le `provider`
 * de la valeur traitée.
 */
function widen(
  definition: (typeof PROVIDER_DEFINITIONS)[ProviderType]
): ProviderDefinition {
  return definition as unknown as ProviderDefinition;
}

/** Définitions dans l'ordre d'affichage et de repli (celui des descripteurs). */
export function providerDefinitions(): ProviderDefinition[] {
  return Object.values(PROVIDER_DEFINITIONS).map(widen);
}

export function getProviderDefinition<P extends ProviderType>(provider: P): ProviderDefinition<P> {
  return PROVIDER_DEFINITIONS[provider];
}

/**
 * Définition correspondant à une valeur discriminée par `provider` (connexion,
 * saisie, brouillon). C'est le seul point où une union est rapprochée de sa
 * définition : les méthodes reçoivent ensuite la valeur telle quelle.
 */
export function definitionFor(value: { provider: ProviderType }): ProviderDefinition {
  return widen(PROVIDER_DEFINITIONS[value.provider]);
}

/** Fabrique le provider métier d'une connexion résolue. */
export function createProviderFor(connection: ResolvedConnection): Promise<IMediaProvider> {
  return definitionFor(connection).createProvider(connection);
}
