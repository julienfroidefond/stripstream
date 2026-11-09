"use client";

import Link from "next/link";
import { BookOpenCheck, Eye, EyeOff, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

interface InProgressAnonymousStateProps {
  onDisable: () => void;
  isPending?: boolean;
}

export function InProgressAnonymousState({
  onDisable,
  isPending = false,
}: InProgressAnonymousStateProps) {
  const { t } = useTranslate();

  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-surface-1/60 px-6 py-12 text-center"
      data-testid="in-progress-anonymous"
    >
      <span className="rounded-2xl bg-primary/10 p-4 text-primary">
        <EyeOff className="h-8 w-8" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">{t("inProgress.anonymous.title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("inProgress.anonymous.description")}
        </p>
      </div>
      <Button onClick={onDisable} disabled={isPending} className="gap-2">
        <Eye className="h-4 w-4" />
        {t("inProgress.anonymous.action")}
      </Button>
    </div>
  );
}

export function InProgressEmptyState() {
  const { t } = useTranslate();

  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-surface-1/60 px-6 py-12 text-center"
      data-testid="in-progress-empty"
    >
      <span className="rounded-2xl bg-primary/10 p-4 text-primary">
        <BookOpenCheck className="h-8 w-8" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold">{t("inProgress.empty.title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("inProgress.empty.description")}
        </p>
      </div>
      <Button asChild className="gap-2">
        <Link href="/wall">{t("inProgress.empty.action")}</Link>
      </Button>
    </div>
  );
}

interface InProgressNoResultsStateProps {
  onReset: () => void;
}

export function InProgressNoResultsState({ onReset }: InProgressNoResultsStateProps) {
  const { t } = useTranslate();

  return (
    <div
      className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-surface-1/60 px-6 py-10 text-center"
      data-testid="in-progress-no-results"
    >
      <span className="rounded-2xl bg-primary/10 p-3 text-primary">
        <SearchX className="h-7 w-7" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">{t("inProgress.noResults.title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("inProgress.noResults.description")}
        </p>
      </div>
      <Button variant="outline" onClick={onReset}>
        {t("inProgress.noResults.reset")}
      </Button>
    </div>
  );
}
