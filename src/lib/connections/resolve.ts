import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-utils";
import { ERROR_CODES } from "@/constants/errorCodes";
import { buildKomgaAuthHeader, decryptSecret } from "@/lib/credentials";
import { AppError } from "@/utils/errors";
import { normalizeServerUrl } from "@/utils/server-url";
import { getActiveConnection } from "./active";
import type {
  KomgaConnection,
  ResolvedConnection,
  StripstreamConnection,
} from "./types";
import type { ProviderType } from "@/lib/providers/types";

interface StoredKomgaConfig {
  id: number;
  url: string;
  authHeader: string;
}

interface StoredStripstreamConfig {
  id: number;
  url: string;
  token: string;
}

const KOMGA_SELECT = { id: true, url: true, authHeader: true } as const;
const STRIPSTREAM_SELECT = { id: true, url: true, token: true } as const;

/**
 * Règle de fallback unique : la config demandée si elle appartient au user,
 * sinon la première config de ce provider. Stripstream ajoute en dernier
 * recours les variables d'environnement ; Komga n'a pas d'équivalent.
 */
async function findKomgaConfig(
  userId: number,
  preferredId: number | null
): Promise<StoredKomgaConfig | null> {
  if (preferredId !== null) {
    const active = await prisma.komgaConfig.findFirst({
      where: { id: preferredId, userId },
      select: KOMGA_SELECT,
    });
    if (active) return active;
  }

  return prisma.komgaConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: KOMGA_SELECT,
  });
}

async function findStripstreamConfig(
  userId: number,
  preferredId: number | null
): Promise<StoredStripstreamConfig | null> {
  if (preferredId !== null) {
    const active = await prisma.stripstreamConfig.findFirst({
      where: { id: preferredId, userId },
      select: STRIPSTREAM_SELECT,
    });
    if (active) return active;
  }

  return prisma.stripstreamConfig.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: STRIPSTREAM_SELECT,
  });
}

function toKomgaConnection(config: StoredKomgaConfig): KomgaConnection {
  return {
    provider: "komga",
    configId: config.id,
    url: config.url,
    authHeader: decryptSecret(config.authHeader),
  };
}

function toStripstreamConnection(config: StoredStripstreamConfig): StripstreamConnection {
  return {
    provider: "stripstream",
    configId: config.id,
    url: config.url,
    token: decryptSecret(config.token),
    source: "db",
  };
}

async function resolveForProvider(
  provider: ProviderType,
  userId: number,
  preferredId: number | null
): Promise<ResolvedConnection | null> {
  if (provider === "komga") {
    const config = await findKomgaConfig(userId, preferredId);
    return config ? toKomgaConnection(config) : null;
  }

  const config = await findStripstreamConfig(userId, preferredId);
  if (config) return toStripstreamConnection(config);

  const url = process.env.STRIPSTREAM_URL?.trim();
  const token = process.env.STRIPSTREAM_TOKEN?.trim();
  if (url && token) {
    return { provider: "stripstream", configId: null, url, token, source: "env" };
  }

  return null;
}

/** Connexion sélectionnée par le navigateur, avec la même règle de fallback. */
export async function resolveActiveConnection(userId: number): Promise<ResolvedConnection | null> {
  const active = await getActiveConnection(userId);
  return resolveForProvider(active.provider, userId, active.configId);
}

/**
 * Connexion d'un provider précis. Si la sélection active porte sur un autre
 * provider, on retombe sur la première config de celui demandé.
 */
export function resolveConnectionForProvider(
  provider: "komga",
  userId: number
): Promise<KomgaConnection | null>;
export function resolveConnectionForProvider(
  provider: "stripstream",
  userId: number
): Promise<StripstreamConnection | null>;
export async function resolveConnectionForProvider(
  provider: ProviderType,
  userId: number
): Promise<ResolvedConnection | null> {
  const active = await getActiveConnection(userId);
  return resolveForProvider(
    provider,
    userId,
    active.provider === provider ? active.configId : null
  );
}

/**
 * Connexion enregistrée précise, sans fallback ni variables d'environnement.
 * Sert aux actions « tester cette config » : on ne veut pas tester une autre
 * connexion à la place de celle demandée.
 */
export function getStoredConnection(
  provider: "komga",
  id: number,
  userId: number
): Promise<KomgaConnection | null>;
export function getStoredConnection(
  provider: "stripstream",
  id: number,
  userId: number
): Promise<StripstreamConnection | null>;
export async function getStoredConnection(
  provider: ProviderType,
  id: number,
  userId: number
): Promise<ResolvedConnection | null> {
  if (provider === "komga") {
    const config = await prisma.komgaConfig.findFirst({
      where: { id, userId },
      select: KOMGA_SELECT,
    });
    return config ? toKomgaConnection(config) : null;
  }

  const config = await prisma.stripstreamConfig.findFirst({
    where: { id, userId },
    select: STRIPSTREAM_SELECT,
  });
  return config ? toStripstreamConnection(config) : null;
}

/**
 * Variante pour les services qui n'ont pas déjà résolu l'utilisateur. Elle
 * conserve le contrat d'erreur historique des routes image/livre Komga.
 */
export function requireConnectionForProvider(provider: "komga"): Promise<KomgaConnection>;
export function requireConnectionForProvider(
  provider: "stripstream"
): Promise<StripstreamConnection>;
export async function requireConnectionForProvider(
  provider: ProviderType
): Promise<ResolvedConnection> {
  const user = await getCurrentUser();
  if (!user) throw new AppError(ERROR_CODES.AUTH.UNAUTHENTICATED);

  const userId = parseInt(user.id, 10);
  const active = await getActiveConnection(userId);
  const connection = await resolveForProvider(
    provider,
    userId,
    active.provider === provider ? active.configId : null
  );

  if (!connection) {
    throw new AppError(
      provider === "komga" ? ERROR_CODES.KOMGA.MISSING_CONFIG : ERROR_CODES.STRIPSTREAM.MISSING_CONFIG
    );
  }
  return connection;
}

/** Connexion ad hoc pour tester des credentials pas encore enregistrés. */
export function connectionFromKomgaCredentials(
  serverUrl: string,
  username: string,
  password: string
): KomgaConnection {
  return {
    provider: "komga",
    configId: null,
    url: normalizeServerUrl(serverUrl),
    authHeader: buildKomgaAuthHeader(username, password),
  };
}

/** Connexion ad hoc pour tester un token pas encore enregistré. */
export function connectionFromStripstreamToken(
  serverUrl: string,
  token: string
): StripstreamConnection {
  return {
    provider: "stripstream",
    configId: null,
    url: normalizeServerUrl(serverUrl),
    token: token.trim(),
    source: "provided",
  };
}
