import { useTranslation } from "react-i18next";

export function useTranslate() {
  const { t, i18n } = useTranslation("common");

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return {
    t,
    i18n,
    changeLanguage,
    currentLanguage: i18n.language,
  };
}
