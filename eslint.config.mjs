import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  {
    ignores: [
      "temp/**",
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "playwright/.cache/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],
      "@next/next/no-html-link-for-pages": "off",
      "react/no-unescaped-entities": "off",
      "no-unreachable": "error",
      "no-unused-expressions": "warn",
      "no-unused-private-class-members": "warn",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-empty-function": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/app/**/*.tsx"],
    rules: {
      "react-hooks/error-boundaries": "off",
    },
  },
  {
    files: [
      "src/components/layout/ClientLayout.tsx",
      "src/components/layout/Sidebar.tsx",
      "src/components/library/LibraryHeader.tsx",
      "src/components/reader/components/PageDisplay.tsx",
      "src/components/reader/components/Thumbnail.tsx",
      "src/components/reader/hooks/useThumbnails.ts",
      "src/components/ui/InstallPWA.tsx",
      "src/components/ui/cover-client.tsx",
      "src/components/series/BookGrid.tsx",
      "src/components/series/BookList.tsx",
      "src/hooks/useNetworkStatus.ts",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    // URLs proxy Komga/Stripstream déjà thumbnailées côté provider :
    // l'optimizer next/image ajouterait un round-trip sans gain réel.
    files: [
      "src/components/ui/cover-client.tsx",
      "src/components/ui/book-cover.tsx",
      "src/components/ui/series-cover.tsx",
      "src/components/series/BookGrid.tsx",
      "src/components/series/BookList.tsx",
      "src/components/layout/GlobalSearch.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);
