"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslate } from "@/hooks/useTranslate";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle, Loader2, Network, Pencil, PlugZap, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import logger from "@/lib/logger";
import {
  deleteKomgaConfig,
  saveKomgaConfig,
  setActiveKomgaConfig,
  testKomgaConfigById,
  testKomgaConnection,
  type KomgaConfigSummary,
} from "@/app/actions/config";
import {
  deleteStripstreamConfig,
  saveStripstreamConfig,
  setActiveStripstreamConfig,
  testStripstreamConfigById,
  testStripstreamConnection,
  type StripstreamConfigSummary,
} from "@/app/actions/stripstream-config";

type ConnectionType = "komga" | "stripstream";

interface UnifiedConnection {
  id: number;
  type: ConnectionType;
  name: string;
  url: string;
  username?: string;
  isActive: boolean;
}

interface ConnectionsSettingsProps {
  komgaConfigs: KomgaConfigSummary[];
  stripstreamConfigs: StripstreamConfigSummary[];
}

interface FormState {
  id?: number;
  type: ConnectionType;
  name: string;
  url: string;
  username: string;
  password: string;
  token: string;
}

const emptyForm: FormState = {
  type: "komga",
  name: "",
  url: "",
  username: "",
  password: "",
  token: "",
};

export function ConnectionsSettings({ komgaConfigs, stripstreamConfigs }: ConnectionsSettingsProps) {
  const { t } = useTranslate();
  const { toast } = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<FormState | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const connections = useMemo<UnifiedConnection[]>(
    () => [
      ...komgaConfigs.map((c) => ({
        id: c.id,
        type: "komga" as const,
        name: c.name,
        url: c.url,
        username: c.username,
        isActive: c.isActive,
      })),
      ...stripstreamConfigs.map((c) => ({
        id: c.id,
        type: "stripstream" as const,
        name: c.name,
        url: c.url,
        isActive: c.isActive,
      })),
    ],
    [komgaConfigs, stripstreamConfigs]
  );

  const activeKey = connections.find((c) => c.isActive)
    ? `${connections.find((c) => c.isActive)!.type}-${connections.find((c) => c.isActive)!.id}`
    : undefined;

  const startCreate = () => setEditing({ ...emptyForm });
  const startEdit = (conn: UnifiedConnection) =>
    setEditing({
      id: conn.id,
      type: conn.type,
      name: conn.name,
      url: conn.url,
      username: conn.username ?? "",
      password: "",
      token: "",
    });
  const cancelEdit = () => setEditing(null);

  const keyOf = (c: UnifiedConnection) => `${c.type}-${c.id}`;

  const handleTest = useCallback(async () => {
    if (!editing) return;
    setIsTesting(true);
    try {
      const result =
        editing.type === "komga"
          ? await testKomgaConnection(editing.url.trim(), editing.username, editing.password)
          : await testStripstreamConnection(editing.url.trim(), editing.token);
      toast({
        variant: result.success ? "default" : "destructive",
        title: t("settings.connections.title"),
        description: result.message,
      });
    } catch (error) {
      logger.error({ err: error }, "Connection test error:");
    } finally {
      setIsTesting(false);
    }
  }, [editing, toast, t]);

  const handleSave = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setIsSaving(true);
    try {
      const result =
        editing.type === "komga"
          ? await saveKomgaConfig({
              id: editing.id,
              name: editing.name,
              url: editing.url.trim(),
              username: editing.username,
              password: editing.password || undefined,
            })
          : await saveStripstreamConfig({
              id: editing.id,
              name: editing.name,
              url: editing.url.trim(),
              token: editing.token || undefined,
            });
      if (!result.success) {
        toast({ variant: "destructive", title: t("common.error"), description: result.message });
      } else {
        toast({ title: t("settings.connections.title"), description: result.message });
        setEditing(null);
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }, [editing, toast, t, router]);

  const handleDelete = useCallback(async (conn: UnifiedConnection) => {
    if (!confirm(t("settings.connections.confirmDelete", { name: conn.name }))) return;
    setBusyKey(keyOf(conn));
    try {
      const result =
        conn.type === "komga"
          ? await deleteKomgaConfig(conn.id)
          : await deleteStripstreamConfig(conn.id);
      toast({
        variant: result.success ? "default" : "destructive",
        title: t("settings.connections.title"),
        description: result.message,
      });
      if (result.success) router.refresh();
    } finally {
      setBusyKey(null);
    }
  }, [t, router, toast]);

  const handleTestExisting = useCallback(async (conn: UnifiedConnection) => {
    setBusyKey(keyOf(conn));
    try {
      const result =
        conn.type === "komga"
          ? await testKomgaConfigById(conn.id)
          : await testStripstreamConfigById(conn.id);
      toast({
        variant: result.success ? "default" : "destructive",
        title: t("settings.connections.title"),
        description: result.message,
      });
    } finally {
      setBusyKey(null);
    }
  }, [t, toast]);

  const handleActivate = useCallback(async (conn: UnifiedConnection) => {
    setBusyKey(keyOf(conn));
    try {
      const result =
        conn.type === "komga"
          ? await setActiveKomgaConfig(conn.id)
          : await setActiveStripstreamConfig(conn.id);
      toast({
        variant: result.success ? "default" : "destructive",
        title: t("settings.connections.title"),
        description: result.message,
      });
      if (result.success) router.refresh();
    } finally {
      setBusyKey(null);
    }
  }, [t, router, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5" />
          {t("settings.connections.title")}
        </CardTitle>
        <CardDescription>{t("settings.connections.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("settings.connections.empty")}</p>
        )}

        {connections.length > 0 && (
          <RadioGroup
            value={activeKey}
            onValueChange={(value) => {
              const conn = connections.find((c) => keyOf(c) === value);
              if (conn && !conn.isActive) handleActivate(conn);
            }}
            className="space-y-2"
            asChild
          >
            <ul>
              {connections.map((conn) => {
                const k = keyOf(conn);
                const isBusy = busyKey === k;
                return (
                  <li
                    key={k}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      conn.isActive ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={k}
                        id={`conn-radio-${k}`}
                        disabled={isBusy}
                        className="mt-1 shrink-0"
                        aria-label={t("settings.connections.activate")}
                      />
                      <label
                        htmlFor={`conn-radio-${k}`}
                        className="min-w-0 flex-1 cursor-pointer space-y-0.5"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{conn.name}</span>
                          <TypeBadge type={conn.type} />
                          {conn.isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                              <CheckCircle className="h-3 w-3" />
                              {t("settings.connections.active")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conn.url}</p>
                        {conn.username && (
                          <p className="text-xs text-muted-foreground truncate">{conn.username}</p>
                        )}
                      </label>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleTestExisting(conn)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary disabled:opacity-50"
                          aria-label={t("settings.connections.test")}
                          title={t("settings.connections.test")}
                        >
                          {isBusy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PlugZap className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => startEdit(conn)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary disabled:opacity-50"
                          aria-label={t("settings.connections.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDelete(conn)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50"
                          aria-label={t("settings.connections.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </RadioGroup>
        )}

        <button type="button" onClick={startCreate} className={cn(btnSecondary, "w-full")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("settings.connections.add")}
        </button>
      </CardContent>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) cancelEdit();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id
                ? t("settings.connections.editTitle")
                : t("settings.connections.addTitle")}
            </DialogTitle>
            <DialogDescription>
              {editing?.id
                ? t("settings.connections.editDescription")
                : t("settings.connections.addDescription")}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <form onSubmit={handleSave} id="connection-form" className="space-y-3">
              {!editing.id && (
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">{t("settings.connections.type")}</span>
                  <div className="grid grid-cols-2 gap-2">
                    <TypeButton
                      label="Komga"
                      description="Basic Auth"
                      selected={editing.type === "komga"}
                      onClick={() => setEditing({ ...editing, type: "komga" })}
                    />
                    <TypeButton
                      label="Stripstream Librarian"
                      description="Bearer Token"
                      selected={editing.type === "stripstream"}
                      onClick={() => setEditing({ ...editing, type: "stripstream" })}
                    />
                  </div>
                </div>
              )}

              {editing.id && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("settings.connections.type")} :
                  </span>
                  <TypeBadge type={editing.type} />
                </div>
              )}

              <FieldRow label={t("settings.connections.name")} htmlFor="conn-name">
                <input
                  id="conn-name"
                  type="text"
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className={inputClass}
                  placeholder={
                    editing.type === "komga"
                      ? t("settings.connections.komgaNamePlaceholder")
                      : t("settings.connections.stripstreamNamePlaceholder")
                  }
                />
              </FieldRow>

              <FieldRow label={t("settings.connections.serverUrl")} htmlFor="conn-url">
                <input
                  id="conn-url"
                  type="url"
                  required
                  value={editing.url}
                  onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                  className={inputClass}
                  placeholder={
                    editing.type === "komga"
                      ? "https://komga.example.com"
                      : "https://librarian.example.com"
                  }
                />
              </FieldRow>

              {editing.type === "komga" ? (
                <>
                  <FieldRow label={t("settings.connections.username")} htmlFor="conn-username">
                    <input
                      id="conn-username"
                      type="text"
                      required
                      value={editing.username}
                      onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                      className={inputClass}
                    />
                  </FieldRow>
                  <FieldRow
                    label={t("settings.connections.password")}
                    htmlFor="conn-password"
                    hint={editing.id ? t("settings.connections.editHint") : undefined}
                  >
                    <input
                      id="conn-password"
                      type="password"
                      required={!editing.id}
                      value={editing.password}
                      onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                      className={inputClass}
                      placeholder={editing.id ? "••••••••" : ""}
                    />
                  </FieldRow>
                </>
              ) : (
                <FieldRow
                  label={t("settings.connections.token")}
                  htmlFor="conn-token"
                  hint={editing.id ? t("settings.connections.editHint") : undefined}
                >
                  <input
                    id="conn-token"
                    type="password"
                    required={!editing.id}
                    value={editing.token}
                    onChange={(e) => setEditing({ ...editing, token: e.target.value })}
                    className={inputClass}
                    placeholder={editing.id ? "••••••••" : "stl_xxxx_xxxxxxxx"}
                  />
                </FieldRow>
              )}
            </form>
          )}

          <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={cancelEdit} className={btnSecondary}>
              {t("settings.connections.cancel")}
            </button>
            <button
              type="button"
              onClick={handleTest}
              disabled={
                !editing ||
                isTesting ||
                !editing.url ||
                (editing.type === "komga"
                  ? !editing.username || !editing.password
                  : !editing.token)
              }
              className={btnSecondary}
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.connections.testing")}
                </>
              ) : (
                t("settings.connections.test")
              )}
            </button>
            <button
              type="submit"
              form="connection-form"
              disabled={isSaving}
              className={btnPrimary}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.connections.saving")}
                </>
              ) : (
                t("settings.connections.save")
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TypeBadge({ type }: { type: ConnectionType }) {
  const label = type === "komga" ? "Komga" : "Stripstream";
  const className =
    type === "komga"
      ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
      : "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs", className)}>
      {label}
    </span>
  );
}

function TypeButton({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-0.5 rounded-lg border p-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"
      )}
    >
      <span className="font-medium text-sm">{label}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function FieldRow({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {hint && <span className="ml-2 text-xs text-muted-foreground">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "flex h-9 w-full rounded-md border border-input bg-background/70 backdrop-blur-md px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-md bg-primary/90 backdrop-blur-md px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-50";

const btnSecondary =
  "inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50";
