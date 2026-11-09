"use client";

import { useTranslate } from "@/hooks/useTranslate";
import { getRelativeTimeParts } from "@/lib/services/in-progress.service";

interface RelativeTimeProps {
  value: string | null;
  /** Horodatage serveur, pour un rendu identique à l'hydratation. */
  now: number;
  className?: string;
  fallback?: string;
}

export function RelativeTime({ value, now, className, fallback }: RelativeTimeProps) {
  const { t, currentLanguage } = useTranslate();
  const parts = getRelativeTimeParts(value, now);

  if (!parts) {
    return <span className={className}>{fallback ?? t("inProgress.neverRead")}</span>;
  }

  if (parts.unit === "second") {
    return <span className={className}>{t("inProgress.justNow")}</span>;
  }

  const formatter = new Intl.RelativeTimeFormat(currentLanguage, { numeric: "auto" });
  return <span className={className}>{formatter.format(parts.value, parts.unit)}</span>;
}
