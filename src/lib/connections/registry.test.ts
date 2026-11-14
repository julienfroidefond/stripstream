import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ default: {} }));
vi.mock("@/lib/auth/session", () => ({ requireUserId: vi.fn(), getCurrentUser: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  default: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { ERROR_MESSAGES } from "@/constants/errorMessages";
import type { ProviderType } from "@/lib/providers/types";
import { CONNECTION_DESCRIPTORS, CONNECTION_PROVIDERS } from "./descriptors";
import {
  PROVIDER_DEFINITIONS,
  definitionFor,
  getProviderDefinition,
  providerDefinitions,
} from "./registry";
import type { ConnectionDraft, ConnectionInput } from "./types";

/** Une saisie complète et un brouillon valides par provider. */
const SAMPLES: { [P in ProviderType]: { input: ConnectionInput; draft: ConnectionDraft } } = {
  komga: {
    input: {
      provider: "komga",
      name: "K",
      url: "http://komga.local",
      username: "alice",
      password: "secret",
    },
    draft: { provider: "komga", url: "http://komga.local/", username: "alice", password: "secret" },
  },
  stripstream: {
    input: { provider: "stripstream", name: "S", url: "http://stream.local", token: "tok" },
    draft: { provider: "stripstream", url: "http://stream.local/", token: " tok " },
  },
};

/** Ligne enregistrée qui correspond exactement à la saisie (même URL, même identité). */
function storedRowFor(input: ConnectionInput) {
  return {
    id: 1,
    url: input.url,
    secret: "stored",
    principal: input.provider === "komga" ? input.username : null,
  };
}

beforeEach(() => {
  vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", Buffer.alloc(32, 3).toString("base64"));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("provider registry", () => {
  it("declares one definition per descriptor, in the same order", () => {
    expect(Object.keys(PROVIDER_DEFINITIONS)).toEqual(Object.keys(CONNECTION_DESCRIPTORS));
    expect(providerDefinitions().map((definition) => definition.provider)).toEqual(
      CONNECTION_PROVIDERS
    );
  });

  describe.each(CONNECTION_PROVIDERS)("%s definition", (provider) => {
    const definition = getProviderDefinition(provider);
    const sample = SAMPLES[provider];

    it("is keyed by its own provider and shares its descriptor", () => {
      expect(definition.provider).toBe(provider);
      expect(definition.descriptor).toBe(CONNECTION_DESCRIPTORS[provider]);
      expect(definitionFor({ provider })).toBe(definition);
    });

    it("declares a catalogued missing-config code", () => {
      expect(ERROR_MESSAGES[definition.missingConfigCode]).toEqual(expect.any(String));
    });

    it("implements the whole Prisma store", () => {
      for (const method of [
        "findOwned",
        "findFirst",
        "findLabel",
        "list",
        "create",
        "update",
        "remove",
      ] as const) {
        expect(typeof definition.store[method]).toBe("function");
      }
    });

    it("encrypts a new secret that toConnection decrypts back into a connection", () => {
      const secret = definition.encodeSecret(sample.input, null);
      expect(secret).toEqual(expect.any(String));

      const connection = definition.toConnection({
        id: 7,
        url: "http://x",
        secret: secret!,
        principal: null,
      });
      expect(connection).toMatchObject({ provider, configId: 7, url: "http://x" });
      // Le secret stocké n'est jamais la valeur déchiffrée.
      expect(Object.values(connection)).not.toContain(secret);
    });

    it("keeps the stored secret when an update carries none, and fails a creation without one", () => {
      const withoutSecret = { ...sample.input, password: undefined, token: undefined };
      const stored = storedRowFor(sample.input);
      expect(definition.encodeSecret(withoutSecret, stored)).toBe("stored");
      expect(definition.encodeSecret(withoutSecret, null)).toBeNull();
    });

    it("still reuses the secret of a row saved before URLs were normalized", () => {
      const withoutSecret = { ...sample.input, password: undefined, token: undefined };
      const legacy = { ...storedRowFor(sample.input), url: `${sample.input.url.toUpperCase()}/` };
      expect(definition.encodeSecret(withoutSecret, legacy)).toBe("stored");
    });

    it("never reuses the stored secret for another server URL", () => {
      const withoutSecret = {
        ...sample.input,
        url: "https://elsewhere.example",
        password: undefined,
        token: undefined,
      };
      expect(definition.encodeSecret(withoutSecret, storedRowFor(sample.input))).toBeNull();
    });

    it("builds an ad hoc connection from a draft with a normalized URL", () => {
      expect(definition.draftConnection(sample.draft)).toMatchObject({
        provider,
        configId: null,
        url: sample.draft.url.replace(/\/+$/, ""),
      });
    });

    it("creates a media provider exposing the core contract", async () => {
      const mediaProvider = await definition.createProvider(
        definition.draftConnection(sample.draft)
      );
      expect(typeof mediaProvider.testConnection).toBe("function");
      expect(mediaProvider.capabilities).toBeDefined();
    });

    it("loads a media transport", async () => {
      const transport = await definition.loadMediaTransport();
      expect(typeof transport.fetch).toBe("function");
    });
  });

  it("no definition declares an environment fallback (ADR 0032)", () => {
    for (const provider of ["komga", "stripstream"] as const) {
      expect("environmentConnection" in getProviderDefinition(provider)).toBe(false);
    }
  });

  it("never reuses a Komga secret for another username", () => {
    const definition = getProviderDefinition("komga");
    const input = { ...(SAMPLES.komga.input as ConnectionInput & { provider: "komga" }), password: undefined };
    const stored = { ...storedRowFor(input), principal: "bob" };
    expect(definition.encodeSecret(input, stored)).toBeNull();
  });
});
