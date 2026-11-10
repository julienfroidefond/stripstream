"use client";

import Link from "next/link";
import { BookOpenCheck, Eye, EyeOff, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslate } from "@/hooks/useTranslate";

const stateClassName =
  "flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center";

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
    <div className={stateClassName} data-testid="in-progress-anonymous">
      <EyeOff className="h-8 w-8 text-muted-foreground/60" />
      <div className="space-y-1">
        <h2 className="font-semibold">{t("inProgress.anonymous.title")}</h2>
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
    <div className={stateClassName} data-testid="in-progress-empty">
      <BookOpenCheck className="h-8 w-8 text-muted-foreground/60" />
      <div className="space-y-1">
        <h2 className="font-semibold">{t("inProgress.empty.title")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("inProgress.empty.description")}
        </p>
      </div>
      <Button asChild>
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
    <div className={stateClassName} data-testid="in-progress-no-results">
      <SearchX className="h-8 w-8 text-muted-foreground/60" />
      <div className="space-y-1">
        <h2 className="font-semibold">{t("inProgress.noResults.title")}</h2>
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
