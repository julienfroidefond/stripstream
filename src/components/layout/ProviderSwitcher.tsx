"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Server, Settings } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/components/ui/use-toast";
import { ConnectionTypeBadge } from "@/components/connections/ConnectionTypeBadge";
import { useActivateConnection } from "@/hooks/useActivateConnection";
import { useTranslate } from "@/hooks/useTranslate";
import {
  connectionSlug,
  findActiveConnection,
  toUnifiedConnections,
  type UnifiedConnection,
} from "@/lib/connections/client";
import type { ConnectionLists } from "@/lib/connections/types";
import { cn } from "@/lib/utils";

interface ProviderSwitcherProps {
  lists: ConnectionLists;
}

export function ProviderSwitcher({ lists }: ProviderSwitcherProps) {
  const { toast } = useToast();
  const { t } = useTranslate();
  const [isOpen, setIsOpen] = useState(false);
  const { activate, pendingKey } = useActivateConnection();

  const connections = useMemo(() => toUnifiedConnections(lists), [lists]);
  const active = findActiveConnection(connections);

  const handleActivate = useCallback(
    async (conn: UnifiedConnection) => {
      if (conn.isActive || pendingKey) return;
      setIsOpen(false);
      const result = await activate(conn);
      // En cas de succès, le hook recharge la page : rien d'autre à faire ici.
      if (!result.success) {
        toast({
          variant: "destructive",
          title: t("header.providerSwitcher.title"),
          description: t(`errors.${result.code}`),
        });
        setIsOpen(true);
      }
    },
    [activate, pendingKey, toast, t]
  );

  // Pas de connexion configurée → bouton qui mène vers les paramètres
  if (connections.length === 0) {
    return (
      <Link
        href="/settings"
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <Server className="h-4 w-4 shrink-0" />
        <span className="truncate">{t("header.providerSwitcher.empty")}</span>
      </Link>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-0.5">
      <CollapsibleTrigger
        data-testid="provider-switcher"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label={t("header.providerSwitcher.title")}
      >
        <Server className="h-4 w-4 shrink-0" />
        {active ? (
          <span className="min-w-0 flex-1 truncate text-left">{active.name}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">
            {t("header.providerSwitcher.empty")}
          </span>
        )}
        {active && <ConnectionTypeBadge provider={active.provider} size="compact" />}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-60 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="space-y-0.5 pl-2">
          {connections.map((conn) => {
            const isBusy = pendingKey === conn.key;
            return (
              <button
                key={conn.key}
                type="button"
                data-testid={`provider-switch-${conn.provider}-${connectionSlug(conn.name)}`}
                onClick={() => handleActivate(conn)}
                disabled={pendingKey !== null}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed",
                  conn.isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                  isBusy && "opacity-70"
                )}
                aria-current={conn.isActive ? "true" : undefined}
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      conn.isActive ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-left">{conn.name}</span>
                <ConnectionTypeBadge provider={conn.provider} size="compact" />
              </button>
            );
          })}
          <Link
            href="/settings"
            className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>{t("header.providerSwitcher.manage")}</span>
          </Link>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
