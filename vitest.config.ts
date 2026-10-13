import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit-test runner (Vitest).
 *
 * Les tests unitaires sont colocalisés avec le code source sous `src/**`.
 * La suite E2E Playwright vit sous `tests/` (voir `playwright.config.ts`), donc
 * les deux runners ne se marchent pas dessus. Environnement `node` par défaut :
 * la majorité des tests couvrent de la logique pure (adapters, helpers,
 * rate-limiter). Les tests de hooks qui ont besoin du DOM basculent par fichier
 * via le docblock `// @vitest-environment jsdom`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
