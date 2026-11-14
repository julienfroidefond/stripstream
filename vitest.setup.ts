import { vi } from "vitest";

/**
 * Les tests unitaires ne doivent jamais dépendre du DNS réel : la garde des
 * transports provider (`assertProviderTargetIsSafe`) résout l'hôte avant
 * chaque requête, et un nom en `.local` part en mDNS (plusieurs secondes).
 * Tout nom résout ici vers une adresse publique de documentation ; les tests
 * qui vérifient la résolution injectent leur propre résolveur.
 */
vi.mock("node:dns/promises", () => {
  const lookup = vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]);
  return { lookup, default: { lookup } };
});
