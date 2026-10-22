import { useTranslation } from "react-i18next";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Remplace les placeholders simple accolade (`{title}`), que i18next ne
 * reconnaît pas (il utilise `{{title}}`). Les clés sont échappées avant
 * construction de la regex : une clé comme `count.total` ne doit pas être
 * interprétée comme un motif.
 */
export function interpolateSingleBracePlaceholders(
  translatedText: string,
  values: Record<string, number | string>
): string {
  const keys = Object.keys(values);
  if (keys.length === 0) return translatedText;

  const placeholderRegex = new RegExp(
    `\\{(${keys.map(escapeRegExp).join("|")})\\}`,
    "g"
  );

  return translatedText.replace(
    placeholderRegex,
    (placeholder, key: string, offset: number, input: string) => {
      // Ne pas casser la syntaxe i18next `{{count}}` : on ne remplace que
      // les accolades simples.
      const isDoubleBrace =
        input[offset - 1] === "{" || input[offset + placeholder.length] === "}";
      if (isDoubleBrace) return placeholder;

      const value = values[key];
      return value === undefined ? placeholder : String(value);
    }
  );
}

export function useTranslate() {
  const { t: tBase, i18n } = useTranslation("common");

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const t = (translationKey: string, values?: { [key: string]: number | string }) => {
    if (values && Object.keys(values).length > 0) {
      const translatedText = tBase(translationKey, values);
      return interpolateSingleBracePlaceholders(translatedText, values);
    }
    return tBase(translationKey, values);
  };

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage: i18n.language,
  };
}
