"use client";

import { Star } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useTranslate } from "@/hooks/useTranslate";

export function RatingsUnavailable() {
  const { t } = useTranslate();

  return (
    <Container
      as="main"
      className="flex min-h-[55vh] flex-col items-center justify-center gap-4 text-center"
    >
      <div className="rounded-2xl bg-muted p-4">
        <Star className="h-9 w-9 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{t("ratings.title")}</h1>
        <p className="max-w-md text-muted-foreground">{t("ratings.unavailable")}</p>
      </div>
    </Container>
  );
}
