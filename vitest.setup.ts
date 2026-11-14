import { vi } from "vitest";

/**
 * Les tests unitaires ne doivent jamais dépendre du DNS réel : la garde des
 * transports provider (`assertProviderTargetIsSafe`) résout l'hôte avant
 * chaque requête, et un nom en `.local` part en mDNS (plusieurs secondes).
 * Un nom inconnu est toléré par la garde ; les tests qui vérifient la
 * résolution injectent leur propre résolveur.
 */
vi.mock("node:dns/promises", () => {
  const lookup = vi.fn(async () => {
    throw Object.assign(new Error("DNS disabled in unit tests"), { code: "ENOTFOUND" });
  });
  return { lookup, default: { lookup } };
});
