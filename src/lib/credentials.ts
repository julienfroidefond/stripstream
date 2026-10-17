import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import logger from "./logger";
import { AppError } from "../utils/errors";
import { ERROR_CODES } from "../constants/errorCodes";

/**
 * Chiffrement au repos des identifiants des providers.
 *
 * Deux secrets sont concernés : l'`authHeader` Komga (base64 `user:password`,
 * qui n'est PAS du chiffrement) et le `token` du Librarian. Les deux sont
 * stockés sous forme d'enveloppe `enc:v1:<iv>:<tag>:<ciphertext>` (AES-256-GCM,
 * IV aléatoire de 96 bits, tag d'authentification de 128 bits).
 *
 * La clé vient de `CREDENTIALS_ENCRYPTION_KEY` (32 octets encodés en base64 —
 * `openssl rand -base64 32` — ou 64 caractères hexadécimaux).
 *
 * Rétro-compatibilité : une valeur sans préfixe `enc:v1:` est renvoyée telle
 * quelle. Les lignes en clair existantes continuent donc de fonctionner, et
 * `scripts/encrypt-credentials.ts` les migre de façon idempotente.
 *
 * Mode dégradé : sans clé, `encryptSecret` écrit en clair et journalise un
 * avertissement. Écrire en clair plutôt qu'échouer garde l'app utilisable après
 * une mise à jour où la clé n'est pas encore configurée ; le log rend la
 * dégradation explicite, jamais silencieuse.
 */

const ALGORITHM = "aes-256-gcm";
const ENVELOPE_PREFIX = "enc:v1:";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const KEY_BYTES = 32;
const HEX_KEY_PATTERN = /^[0-9a-fA-F]{64}$/;

export const ENCRYPTION_KEY_ENV_VAR = "CREDENTIALS_ENCRYPTION_KEY";
export const ENCRYPTION_KEY_GENERATION_HINT = "openssl rand -base64 32";

function parseKey(raw: string): Buffer {
  const value = raw.trim();
  const key = HEX_KEY_PATTERN.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");

  if (key.length !== KEY_BYTES) {
    throw new AppError(ERROR_CODES.CREDENTIALS.INVALID_ENCRYPTION_KEY, {
      env: ENCRYPTION_KEY_ENV_VAR,
      hint: ENCRYPTION_KEY_GENERATION_HINT,
    });
  }

  return key;
}

/** `true` dès qu'une clé non vide est présente, même si elle est invalide. */
export function isEncryptionConfigured(): boolean {
  return Boolean(process.env[ENCRYPTION_KEY_ENV_VAR]?.trim());
}

/** Résout la clé, ou `null` en mode dégradé (clé absente). */
function resolveKey(): Buffer | null {
  const raw = process.env[ENCRYPTION_KEY_ENV_VAR];
  if (!raw?.trim()) return null;
  return parseKey(raw);
}

/** Une valeur déjà chiffrée porte l'enveloppe `enc:v1:` et doit être déchiffrée. */
export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(ENVELOPE_PREFIX);
}

function warnMissingKey(): void {
  logger.warn(
    { env: ENCRYPTION_KEY_ENV_VAR },
    `Credential encryption is disabled: set ${ENCRYPTION_KEY_ENV_VAR} to store provider credentials encrypted`
  );
}

/**
 * Chiffre un secret. En l'absence de clé, retourne la valeur en clair (mode
 * dégradé) après un avertissement.
 */
export function encryptSecret(plaintext: string): string {
  const key = resolveKey();
  if (!key) {
    warnMissingKey();
    return plaintext;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const body = `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
  return `${ENVELOPE_PREFIX}${body}`;
}

/**
 * Déchiffre un secret. Une valeur sans enveloppe est retournée telle quelle
 * (ligne legacy en clair). Lève `CREDENTIALS_DECRYPT_ERROR` si le contenu est
 * altéré ou si la clé ne correspond pas.
 */
export function decryptSecret(value: string): string {
  if (!isEncryptedSecret(value)) return value;

  const key = resolveKey();
  if (!key) {
    throw new AppError(ERROR_CODES.CREDENTIALS.MISSING_ENCRYPTION_KEY, {
      env: ENCRYPTION_KEY_ENV_VAR,
      hint: ENCRYPTION_KEY_GENERATION_HINT,
    });
  }

  const parts = value.slice(ENVELOPE_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new AppError(ERROR_CODES.CREDENTIALS.DECRYPT_ERROR, {
      env: ENCRYPTION_KEY_ENV_VAR,
    });
  }

  const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64"));
  if (iv.length !== IV_BYTES || tag.length !== AUTH_TAG_BYTES) {
    throw new AppError(ERROR_CODES.CREDENTIALS.DECRYPT_ERROR, {
      env: ENCRYPTION_KEY_ENV_VAR,
    });
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (error) {
    throw new AppError(
      ERROR_CODES.CREDENTIALS.DECRYPT_ERROR,
      { env: ENCRYPTION_KEY_ENV_VAR },
      error
    );
  }
}

/**
 * Construit l'en-tête Basic Komga (`base64("user:password")`) destiné au fil
 * HTTP. Le chiffrement au repos est appliqué séparément par `encryptSecret`.
 *
 * `password` est volontairement permissif (`KomgaConfigData.password` est
 * optionnel) : la conversion reprend la sémantique historique du template
 * `${username}:${password}`.
 */
export function buildKomgaAuthHeader(
  username: string,
  password: string | null | undefined
): string {
  return Buffer.from(`${username}:${password}`).toString("base64");
}
