import { useTranslation } from "react-i18next";

export function useTranslate() {
  const { t: tBase, i18n } = useTranslation("common");

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const t = (translationKey: string, values?: { [key: string]: number | string }) => {
    if (values && Object.keys(values).length > 0) {
      const translatedText = tBase(translationKey, values);

      const placeholderRegex = new RegExp(`(\{${Object.keys(values).join("}|{")}\})`, "g");

      const parts = translatedText.split(placeholderRegex);
      return parts
        .map((part) => {
          const key = part.replace(/[{}]/g, "");
          if (values[key] !== undefined) {
            return values[key];
          }
          return part;
        })
        .join("");
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
