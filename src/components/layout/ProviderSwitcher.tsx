"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2, Server, Settings } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";
import { cn } from "@/lib/utils";
import {
  setActiveKomgaConfig,
  type KomgaConfigSummary,
} from "@/app/actions/config";
import {
  setActiveStripstreamConfig,
  type StripstreamConfigSummary,
} from "@/app/actions/stripstream-config";
import { useConnectionTransition } from "@/contexts/ConnectionTransitionContext";

type ConnectionType = "komga" | "stripstream";

interface UnifiedConnection {
  id: number;
  type: ConnectionType;
  name: string;
  isActive: boolean;
}

interface ProviderSwitcherProps {
  komgaConfigs: KomgaConfigSummary[];
  stripstreamConfigs: StripstreamConfigSummary[];
}

export function ProviderSwitcher({ komgaConfigs, stripstreamConfigs }: ProviderSwitcherProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslate();
  const { beginConnectionSwitch, cancelConnectionSwitch } = useConnectionTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const connections = useMemo<UnifiedConnection[]>(
    () => [
      ...komgaConfigs.map((c) => ({
        id: c.id,
        type: "komga" as const,
        name: c.name,
        isActive: c.isActive,
      })),
      ...stripstreamConfigs.map((c) => ({
        id: c.id,
        type: "stripstream" as const,
        name: c.name,
        isActive: c.isActive,
      })),
    ],
    [komgaConfigs, stripstreamConfigs]
  );

  const active = connections.find((c) => c.isActive);
  const keyOf = (c: UnifiedConnection) => `${c.type}-${c.id}`;

  const handleActivate = useCallback(
    async (conn: UnifiedConnection) => {
      if (conn.isActive || busyKey) return;
      setBusyKey(keyOf(conn));
      setIsOpen(false);
      beginConnectionSwitch();
      try {
        const result =
          conn.type === "komga"
            ? await setActiveKomgaConfig(conn.id)
            : await setActiveStripstreamConfig(conn.id);
        toast({
          variant: result.success ? "default" : "destructive",
          title: t("header.providerSwitcher.title"),
          description: result.message,
        });
        if (result.success) {
          // Une navigation RSC repasse par les Suspense de la home et affiche
          // les skeletons, contrairement à router.refresh() qui conserve
          // l'ancien arbre pendant le chargement.
          router.replace(`/?connection=${Date.now()}`);
        } else {
          cancelConnectionSwitch();
          setIsOpen(true);
        }
      } catch {
        cancelConnectionSwitch();
        setIsOpen(true);
      } finally {
        setBusyKey(null);
      }
    },
    [beginConnectionSwitch, busyKey, cancelConnectionSwitch, router, toast, t]
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
          "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        {active && <TypeBadge type={active.type} />}
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
            const k = keyOf(conn);
            const isBusy = busyKey === k;
            return (
              <button
                key={k}
                type="button"
                data-testid={`provider-switch-${conn.type}-${conn.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                onClick={() => handleActivate(conn)}
                disabled={busyKey !== null}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                <TypeBadge type={conn.type} />
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

function TypeBadge({ type }: { type: ConnectionType }) {
  const label = type === "komga" ? "Komga" : "Stripstream";
  const className =
    type === "komga"
      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      : "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        className
      )}
    >
      {label}
    </span>
  );
}
