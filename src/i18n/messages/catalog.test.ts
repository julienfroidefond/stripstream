import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import en from "./en/common.json";
import fr from "./fr/common.json";

/**
 * Complétude du catalogue i18n.
 *
 * 1. `fr` et `en` exposent exactement le même ensemble de clés : une clé
 *    ajoutée dans une seule langue s'affiche brute dans l'autre.
 * 2. Toute clé littérale passée à `t("…")` dans `src/` existe dans les deux
 *    langues. Les clés dynamiques (`t(\`errors.${code}\`)`, variables) ne
 *    sont pas analysables ici ; celles d'erreur sont couvertes par l'ADR 0014.
 */

type Catalog = { [key: string]: string | Catalog };

/** Suffixes de pluriel i18next : `results_one` répond à `t("results")`. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function flatten(catalog: Catalog, prefix = ""): string[] {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : flatten(value, path);
  });
}

function resolvableKeys(catalog: Catalog): Set<string> {
  const keys = new Set<string>();
  for (const key of flatten(catalog)) {
    keys.add(key);
    keys.add(key.replace(PLURAL_SUFFIX, ""));
  }
  return keys;
}

const SRC_ROOT = fileURLToPath(new URL("../..", import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      return entry === "generated" ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : [];
  });
}

/** `t("a.b")`, `t('a.b', …)`, `t(\`a.b\`)` sans interpolation. */
const LITERAL_CALL = /(?<![\w.])t\(\s*(?:"([^"\n]+)"|'([^'\n]+)'|`([^`$\n]+)`)/g;
const KEY_SHAPE = /^[A-Za-z][\w-]*(\.[\w-]+)+$/;

function literalKeys(): { key: string; file: string }[] {
  return sourceFiles(SRC_ROOT).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return Array.from(source.matchAll(LITERAL_CALL), (match) => ({
      key: match[1] ?? match[2] ?? match[3],
      file: relative(SRC_ROOT, file),
    })).filter(({ key }) => KEY_SHAPE.test(key));
  });
}

describe("i18n catalog", () => {
  const frKeys = flatten(fr as Catalog);
  const enKeys = flatten(en as Catalog);

  it("declares the same keys in fr and en", () => {
    const en = new Set(enKeys);
    const fr = new Set(frKeys);
    expect({
      onlyInFr: frKeys.filter((key) => !en.has(key)),
      onlyInEn: enKeys.filter((key) => !fr.has(key)),
    }).toEqual({ onlyInFr: [], onlyInEn: [] });
  });

  it("finds literal t() calls to check", () => {
    expect(literalKeys().length).toBeGreaterThan(100);
  });

  it("resolves every literal t() key in both locales", () => {
    const resolvable = {
      fr: resolvableKeys(fr as Catalog),
      en: resolvableKeys(en as Catalog),
    };
    const missing = literalKeys().flatMap(({ key, file }) =>
      (["fr", "en"] as const)
        .filter((locale) => !resolvable[locale].has(key))
        .map((locale) => `${locale}: ${key} (${file})`)
    );

    expect(missing).toEqual([]);
  });
});
