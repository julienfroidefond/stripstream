import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";
import type {
  ConnectionDraft,
  ConnectionInput,
  ConnectionInputOf,
  ConnectionRef,
} from "./types";

/**
 * Description d'un provider partagée entre le serveur et le client : libellés,
 * champs de saisie et leur validation. Ce module est pur (aucun import serveur)
 * pour que le formulaire de connexion et les actions appliquent la même règle.
 * La partie serveur d'un provider (Prisma, credentials, factories) vit dans
 * `registry.ts` et référence ce descripteur.
 */

/** Champs propres à un provider, en plus de `name` et `url`. */
export type ConnectionFieldName<P extends ProviderType> = P extends ProviderType
  ? Exclude<keyof ConnectionInputOf<P>, "provider" | "id" | "name" | "url"> & string
  : never;

export interface ConnectionFieldDescriptor<F extends string = string> {
  name: F;
  /** Clé i18n du libellé. */
  labelKey: string;
  inputType: "text" | "password";
  /**
   * `always` : requis à la création comme à la mise à jour.
   * `on-create` : secret requis à la création ; vide en mise à jour, la valeur
   * enregistrée est conservée.
   */
  required: "always" | "on-create";
  /** Les espaces de bord sont retirés avant validation et enregistrement. */
  trim: boolean;
  /** Placeholder affiché à la création (un secret existant affiche `••••`). */
  placeholder?: string;
}

/**
 * Descripteur d'un provider. Distributif : `ConnectionDescriptor` (sans
 * paramètre) est l'union des descripteurs, chacun avec ses propres champs.
 */
export type ConnectionDescriptor<P extends ProviderType = ProviderType> = P extends ProviderType
  ? ProviderConnectionDescriptor<P>
  : never;

interface ProviderConnectionDescriptor<P extends ProviderType> {
  provider: P;
  /** Libellé court (badge). */
  label: string;
  /** Libellé complet (choix du type dans le formulaire). */
  title: string;
  /** Mode d'authentification affiché sous le titre. */
  authLabel: string;
  /** Classes Tailwind du badge de type. */
  badgeClassName: string;
  /** Clé i18n du placeholder du nom. */
  namePlaceholderKey: string;
  urlPlaceholder: string;
  fields: readonly ConnectionFieldDescriptor<ConnectionFieldName<P>>[];
}

const komgaDescriptor: ConnectionDescriptor<"komga"> = {
  provider: "komga",
  label: "Komga",
  title: "Komga",
  authLabel: "Basic Auth",
  badgeClassName: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  namePlaceholderKey: "settings.connections.komgaNamePlaceholder",
  urlPlaceholder: "https://komga.example.com",
  fields: [
    {
      name: "username",
      labelKey: "settings.connections.username",
      inputType: "text",
      required: "always",
      trim: true,
    },
    {
      name: "password",
      labelKey: "settings.connections.password",
      inputType: "password",
      required: "on-create",
      trim: false,
    },
  ],
};

const stripstreamDescriptor: ConnectionDescriptor<"stripstream"> = {
  provider: "stripstream",
  label: "Stripstream",
  title: "Stripstream Librarian",
  authLabel: "Bearer Token",
  badgeClassName: "bg-primary/15 text-primary",
  namePlaceholderKey: "settings.connections.stripstreamNamePlaceholder",
  urlPlaceholder: "https://librarian.example.com",
  fields: [
    {
      name: "token",
      labelKey: "settings.connections.token",
      inputType: "password",
      required: "on-create",
      trim: true,
      placeholder: "stl_xxxx_xxxxxxxx",
    },
  ],
};

/**
 * Un descripteur par provider. L'ordre des clés est l'ordre d'affichage et
 * l'ordre de repli quand aucune connexion n'est sélectionnée.
 */
export const CONNECTION_DESCRIPTORS: { readonly [P in ProviderType]: ConnectionDescriptor<P> } = {
  komga: komgaDescriptor,
  stripstream: stripstreamDescriptor,
};

export const CONNECTION_PROVIDERS = Object.keys(CONNECTION_DESCRIPTORS) as ProviderType[];

export function isConnectionProvider(value: unknown): value is ProviderType {
  return typeof value === "string" && Object.hasOwn(CONNECTION_DESCRIPTORS, value);
}

export function connectionDescriptor<P extends ProviderType>(provider: P): ConnectionDescriptor<P> {
  return CONNECTION_DESCRIPTORS[provider];
}

export type ConnectionValidation<T> = { ok: true; value: T } | { ok: false; code: ErrorCode };

const invalid = { ok: false, code: ERROR_CODES.CONFIG.INVALID_INPUT } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function requiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Valide les champs propres au provider. `creating` rend les secrets
 * `on-create` obligatoires ; en mise à jour, un secret vide est omis pour que
 * la valeur enregistrée soit conservée.
 */
function validateFields(
  descriptor: ConnectionDescriptor,
  raw: Record<string, unknown>,
  creating: boolean
): Record<string, string> | null {
  const values: Record<string, string> = {};
  for (const field of descriptor.fields) {
    const value = raw[field.name];
    if (value !== undefined && typeof value !== "string") return null;
    const normalized = field.trim ? (value ?? "").trim() : (value ?? "");
    const required = field.required === "always" || creating;
    if (!normalized) {
      if (required) return null;
      continue;
    }
    values[field.name] = normalized;
  }
  return values;
}

/**
 * Valide une saisie non fiable (argument d'action, état de formulaire) et la
 * normalise : nom, URL et champs `trim` sans espaces de bord, secrets vides
 * omis en mise à jour. L'URL n'est pas encore normalisée ici : c'est
 * `normalizeServerUrl`, côté serveur, qui la vérifie (`CONFIG_INVALID_URL`).
 */
export function validateConnectionInput(raw: unknown): ConnectionValidation<ConnectionInput> {
  if (!isRecord(raw) || !isConnectionProvider(raw.provider)) return invalid;
  if (raw.id !== undefined && !isPositiveId(raw.id)) return invalid;

  const name = requiredText(raw.name);
  const url = requiredText(raw.url);
  if (!name || !url) return invalid;

  const descriptor = connectionDescriptor(raw.provider);
  const fields = validateFields(descriptor, raw, raw.id === undefined);
  if (!fields) return invalid;

  return {
    ok: true,
    // Les champs ont été validés contre le descripteur du provider annoncé :
    // l'objet a donc la forme de la branche `provider` de l'union.
    value: {
      provider: raw.provider,
      ...(raw.id === undefined ? {} : { id: raw.id }),
      name,
      url,
      ...fields,
    } as ConnectionInput,
  };
}

/** Valide des credentials à tester avant enregistrement : tous les secrets sont requis. */
export function validateConnectionDraft(raw: unknown): ConnectionValidation<ConnectionDraft> {
  if (!isRecord(raw) || !isConnectionProvider(raw.provider)) return invalid;

  const url = requiredText(raw.url);
  if (!url) return invalid;

  const fields = validateFields(connectionDescriptor(raw.provider), raw, true);
  if (!fields) return invalid;

  return {
    ok: true,
    value: { provider: raw.provider, url, ...fields } as ConnectionDraft,
  };
}

/** Valide une référence `{ provider, id }` reçue du client. */
export function validateConnectionRef(raw: unknown): ConnectionValidation<ConnectionRef> {
  if (!isRecord(raw) || !isConnectionProvider(raw.provider) || !isPositiveId(raw.id)) {
    return invalid;
  }
  return { ok: true, value: { provider: raw.provider, id: raw.id } };
}
