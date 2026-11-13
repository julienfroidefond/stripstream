"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslate } from "@/hooks/useTranslate";
import { useActivateConnection } from "@/hooks/useActivateConnection";
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
import { ConnectionTypeBadge } from "@/components/connections/ConnectionTypeBadge";
import { cn } from "@/lib/utils";
import logger from "@/lib/logger";
import {
  deleteConnection,
  saveConnection,
  testConnection,
} from "@/app/actions/connections";
import type { ActionResult } from "@/lib/actions/action-runner";
import {
  CONNECTION_PROVIDERS,
  connectionDescriptor,
  validateConnectionDraft,
  validateConnectionInput,
} from "@/lib/connections/descriptors";
import {
  connectionSlug,
  findActiveConnection,
  toUnifiedConnections,
  type UnifiedConnection,
} from "@/lib/connections/client";
import type { ConnectionLists } from "@/lib/connections/types";
import type { ErrorCode } from "@/constants/errorCodes";
import type { ProviderType } from "@/lib/providers/types";

interface ConnectionsSettingsProps {
  lists: ConnectionLists;
  /** Code d'erreur si la liste n'a pas pu être chargée. */
  errorCode?: ErrorCode;
  /** Ouvre le formulaire d'ajout au montage, type pré-sélectionné (deep-link `?new=`). */
  autoStartType?: ProviderType;
}

/**
 * État du formulaire, commun à tous les providers : les champs propres au
 * provider (identifiant, mot de passe, token…) sont indexés par le nom que leur
 * donne le descripteur.
 */
interface FormState {
  id?: number;
  provider: ProviderType;
  name: string;
  url: string;
  fields: Record<string, string>;
}

function emptyForm(provider: ProviderType = CONNECTION_PROVIDERS[0]): FormState {
  return { provider, name: "", url: "", fields: {} };
}

function formValues(form: FormState) {
  return { ...form.fields, provider: form.provider, id: form.id, name: form.name, url: form.url };
}

export function ConnectionsSettings({ lists, errorCode, autoStartType }: ConnectionsSettingsProps) {
  const { t } = useTranslate();
  const { toast } = useToast();
  const router = useRouter();
  const { activate, pendingKey } = useActivateConnection();
  // Deep-link `?new=` : le formulaire est ouvert dès le montage, type déjà choisi.
  const [editing, setEditing] = useState<FormState | null>(() =>
    autoStartType ? emptyForm(autoStartType) : null
  );
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const connections = useMemo(() => toUnifiedConnections(lists), [lists]);
  const activeKey = findActiveConnection(connections)?.key;
  const descriptor = editing ? connectionDescriptor(editing.provider) : null;
  const draft = editing ? validateConnectionDraft(formValues(editing)) : null;

  const notify = useCallback(
    (result: ActionResult, successDescription: string) => {
      toast(
        result.success
          ? { title: t("settings.connections.title"), description: successDescription }
          : {
              variant: "destructive",
              title: t("settings.connections.title"),
              description: t(`errors.${result.code}`),
            }
      );
    },
    [toast, t]
  );

  const startCreate = () => setEditing(emptyForm());
  const startEdit = (conn: UnifiedConnection) =>
    setEditing({
      id: conn.id,
      provider: conn.provider,
      name: conn.name,
      url: conn.url,
      fields: { ...conn.fields },
    });
  const cancelEdit = () => setEditing(null);

  const handleTest = useCallback(async () => {
    if (!draft?.ok) return;
    setIsTesting(true);
    try {
      const result = await testConnection({ draft: draft.value });
      notify(
        result,
        result.success
          ? t("settings.connections.testSuccess", { count: result.libraryCount })
          : ""
      );
    } catch (error) {
      logger.error({ err: error }, "Connection test error:");
    } finally {
      setIsTesting(false);
    }
  }, [draft, notify, t]);

  const handleSave = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!editing) return;
      const input = validateConnectionInput(formValues(editing));
      if (!input.ok) {
        toast({ variant: "destructive", title: t("common.error"), description: t(`errors.${input.code}`) });
        return;
      }
      setIsSaving(true);
      try {
        const result = await saveConnection(input.value);
        if (!result.success) {
          toast({
            variant: "destructive",
            title: t("common.error"),
            description: t(`errors.${result.code}`),
          });
        } else {
          toast({
            title: t("settings.connections.title"),
            description: t(
              result.created ? "settings.connections.created" : "settings.connections.updated"
            ),
          });
          setEditing(null);
          router.refresh();
        }
      } finally {
        setIsSaving(false);
      }
    },
    [editing, toast, t, router]
  );

  const handleDelete = useCallback(
    async (conn: UnifiedConnection) => {
      if (!confirm(t("settings.connections.confirmDelete", { name: conn.name }))) return;
      setBusyKey(conn.key);
      try {
        const result = await deleteConnection({ provider: conn.provider, id: conn.id });
        notify(result, t("settings.connections.deleted"));
        if (result.success) router.refresh();
      } finally {
        setBusyKey(null);
      }
    },
    [t, router, notify]
  );

  const handleTestExisting = useCallback(
    async (conn: UnifiedConnection) => {
      setBusyKey(conn.key);
      try {
        const result = await testConnection({ stored: { provider: conn.provider, id: conn.id } });
        notify(
          result,
          result.success
            ? t("settings.connections.testSuccess", { count: result.libraryCount })
            : ""
        );
      } finally {
        setBusyKey(null);
      }
    },
    [t, notify]
  );

  const handleActivate = useCallback(
    async (conn: UnifiedConnection) => {
      // Succès : le hook recharge toute la page (même politique que la sidebar).
      const result = await activate(conn);
      if (!result.success) notify(result, "");
    },
    [activate, notify]
  );

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
        {errorCode && (
          <p role="alert" className="text-sm text-destructive">
            {t(`errors.${errorCode}`)}
          </p>
        )}

        {!errorCode && connections.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("settings.connections.empty")}</p>
        )}

        {connections.length > 0 && (
          <RadioGroup
            value={activeKey}
            onValueChange={(value) => {
              const conn = connections.find((c) => c.key === value);
              if (conn && !conn.isActive) handleActivate(conn);
            }}
            className="space-y-2"
            asChild
          >
            <ul>
              {connections.map((conn) => {
                const k = conn.key;
                const isBusy = busyKey === k || pendingKey === k;
                return (
                  <li
                    key={k}
                    data-testid={`connection-${conn.provider}-${connectionSlug(conn.name)}`}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      conn.isActive ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value={k}
                        id={`conn-radio-${k}`}
                        disabled={isBusy || pendingKey !== null}
                        className="mt-1 shrink-0"
                        aria-label={t("settings.connections.activate")}
                      />
                      <label
                        htmlFor={`conn-radio-${k}`}
                        className="min-w-0 flex-1 cursor-pointer space-y-0.5"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{conn.name}</span>
                          <ConnectionTypeBadge provider={conn.provider} />
                          {conn.isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                              <CheckCircle className="h-3 w-3" />
                              {t("settings.connections.active")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conn.url}</p>
                        {Object.entries(conn.fields).map(([field, value]) => (
                          <p key={field} className="text-xs text-muted-foreground truncate">
                            {value}
                          </p>
                        ))}
                      </label>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          data-testid="connection-test"
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
                          data-testid="connection-edit"
                          type="button"
                          disabled={isBusy}
                          onClick={() => startEdit(conn)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary disabled:opacity-50"
                          aria-label={t("settings.connections.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          data-testid="connection-delete"
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

        <button type="button" data-testid="connection-add" onClick={startCreate} className={cn(btnSecondary, "w-full")}>
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
        {/*
          Monté uniquement à l'ouverture : si le contenu restait monté pendant
          son animation de sortie, un clic sur « Modifier » juste après une
          sauvegarde rouvrirait le dialog pendant cette animation. Radix diffère
          alors le pointerdown extérieur au clic suivant, si bien que ce clic
          ouvrait puis refermait aussitôt le formulaire.
        */}
        {editing !== null && descriptor !== null && (
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editing.id
                  ? t("settings.connections.editTitle")
                  : t("settings.connections.addTitle")}
              </DialogTitle>
              <DialogDescription>
                {editing.id
                  ? t("settings.connections.editDescription")
                  : t("settings.connections.addDescription")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} id="connection-form" className="space-y-3">
              {!editing.id && (
                <div className="space-y-1.5">
                  <span className="text-sm font-medium">{t("settings.connections.type")}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {CONNECTION_PROVIDERS.map((provider) => {
                      const option = connectionDescriptor(provider);
                      return (
                        <TypeButton
                          key={provider}
                          label={option.title}
                          description={option.authLabel}
                          selected={editing.provider === provider}
                          onClick={() => setEditing({ ...editing, provider })}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {editing.id && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    {t("settings.connections.type")} :
                  </span>
                  <ConnectionTypeBadge provider={editing.provider} />
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
                  placeholder={t(descriptor.namePlaceholderKey)}
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
                  placeholder={descriptor.urlPlaceholder}
                />
              </FieldRow>

              {descriptor.fields.map((field) => {
                // En édition, un secret vide conserve la valeur enregistrée.
                const keepsStoredValue = Boolean(editing.id) && field.required === "on-create";
                return (
                  <FieldRow
                    key={field.name}
                    label={t(field.labelKey)}
                    htmlFor={`conn-${field.name}`}
                    hint={keepsStoredValue ? t("settings.connections.editHint") : undefined}
                  >
                    <input
                      id={`conn-${field.name}`}
                      type={field.inputType}
                      required={!keepsStoredValue}
                      value={editing.fields[field.name] ?? ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          fields: { ...editing.fields, [field.name]: e.target.value },
                        })
                      }
                      className={inputClass}
                      placeholder={keepsStoredValue ? "••••••••" : (field.placeholder ?? "")}
                    />
                  </FieldRow>
                );
              })}
            </form>

            <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={cancelEdit} className={btnSecondary}>
                {t("settings.connections.cancel")}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !draft?.ok}
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
                data-testid="connection-save"
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
        )}
      </Dialog>
    </Card>
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
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
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
  "flex h-9 w-full rounded-md border border-input bg-surface-1 px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const btnPrimary =
  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50";

const btnSecondary =
  "inline-flex h-9 items-center justify-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50";
