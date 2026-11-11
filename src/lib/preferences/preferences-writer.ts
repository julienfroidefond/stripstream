import { defaultPreferences, type UserPreferences } from "@/types/preferences";

/**
 * Politique d'écriture des préférences côté client.
 *
 * Toutes les surfaces passent par ce module. Il applique le patch de façon
 * optimiste, regroupe les mises à jour continues, sérialise les appels serveur,
 * revient au dernier état confirmé en cas d'échec et émet un seul événement de
 * feedback par lot.
 */

export type PreferencesPatch = Partial<UserPreferences>;

/**
 * `silent` : aucun toast (l'appelant gère l'erreur, comme le mode anonyme).
 * `errors` : toast uniquement en cas d'échec (contrôles continus).
 * `all` : toast de succès et d'échec (un réglage discret).
 */
export type PreferencesFeedback = "silent" | "errors" | "all";

export interface PreferencesWriteOptions {
  /** Regroupe les écritures rapprochées dans une seule requête serveur. */
  coalesce?: boolean;
  feedback?: PreferencesFeedback;
}

export type PreferencesWriterEvent =
  | { type: "saved"; preferences: UserPreferences; feedback: PreferencesFeedback }
  | { type: "failed"; error: unknown; feedback: PreferencesFeedback };

export type PersistPreferences = (patch: PreferencesPatch) => Promise<UserPreferences>;
export type NotifyPreferences = (event: PreferencesWriterEvent) => void;
/** Planifie un flush et renvoie sa fonction d'annulation. */
export type ScheduleFlush = (callback: () => void, delayMs: number) => () => void;

export const DEFAULT_COALESCE_MS = 250;

const FEEDBACK_RANK: Record<PreferencesFeedback, number> = {
  silent: 0,
  errors: 1,
  all: 2,
};

const defaultSchedule: ScheduleFlush = (callback, delayMs) => {
  const timeout = setTimeout(callback, delayMs);
  return () => clearTimeout(timeout);
};

function strongestFeedback(
  current: PreferencesFeedback,
  next: PreferencesFeedback
): PreferencesFeedback {
  return FEEDBACK_RANK[next] > FEEDBACK_RANK[current] ? next : current;
}

function definedEntries<T extends object>(value: T | undefined): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as Partial<T>;
}

/** Fusionne un patch dans un état complet sans perdre les objets imbriqués. */
export function mergePreferences(
  base: UserPreferences,
  patch: PreferencesPatch
): UserPreferences {
  const definedPatch = definedEntries(patch);
  const merged = { ...base, ...definedPatch };

  if (patch.displayMode) {
    merged.displayMode = {
      ...base.displayMode,
      ...definedEntries(patch.displayMode),
    };
  }

  if (patch.background) {
    merged.background = {
      ...base.background,
      ...definedEntries(patch.background),
    } as UserPreferences["background"];
  }

  return merged;
}

/** Fusionne deux patches successifs, y compris `displayMode` et `background`. */
export function mergePreferencePatches(
  base: PreferencesPatch,
  next: PreferencesPatch
): PreferencesPatch {
  const merged = { ...base, ...definedEntries(next) };

  if (base.displayMode || next.displayMode) {
    merged.displayMode = {
      ...base.displayMode,
      ...next.displayMode,
    } as UserPreferences["displayMode"];
  }

  if (base.background || next.background) {
    merged.background = {
      ...base.background,
      ...next.background,
    } as UserPreferences["background"];
  }

  return merged;
}

export interface PreferencesWriterOptions {
  initial: UserPreferences;
  persist: PersistPreferences;
  notify?: NotifyPreferences;
  schedule?: ScheduleFlush;
  coalesceMs?: number;
}

export class PreferencesWriter {
  /** Dernier état confirmé par le serveur (ou état initial / reset). */
  private confirmed: UserPreferences;
  /** État affiché : confirmé + écritures en vol + patchs en attente. */
  private visible: UserPreferences;

  private readonly persist: PersistPreferences;
  private notify: NotifyPreferences;
  private readonly schedule: ScheduleFlush;
  private readonly coalesceMs: number;

  private readonly listeners = new Set<() => void>();
  private pendingPatch: PreferencesPatch | null = null;
  private pendingReady = false;
  private pendingFeedback: PreferencesFeedback = "silent";
  private coalesceTimer: (() => void) | null = null;
  private drainPromise: Promise<void> | null = null;
  private activeWaiters: Array<(saved: boolean) => void> | null = null;
  private waiters: Array<(saved: boolean) => void> = [];
  /** Incrémenté à chaque reset pour ignorer les réponses devenues obsolètes. */
  private generation = 0;

  constructor(options: PreferencesWriterOptions) {
    this.confirmed = options.initial;
    this.visible = options.initial;
    this.persist = options.persist;
    this.notify = options.notify ?? (() => undefined);
    this.schedule = options.schedule ?? defaultSchedule;
    this.coalesceMs = options.coalesceMs ?? DEFAULT_COALESCE_MS;
  }

  getSnapshot = (): UserPreferences => this.visible;

  /** Remplace la politique de feedback sans recréer le writer. */
  setNotify = (notify: NotifyPreferences): void => {
    this.notify = notify;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /**
   * Applique immédiatement le patch à l'état visible et renvoie `true` quand le
   * lot contenant cette écriture a été confirmé par le serveur.
   */
  update = (
    patch: PreferencesPatch,
    options: PreferencesWriteOptions = {}
  ): Promise<boolean> => {
    const compacted = definedEntries(patch);
    if (Object.keys(compacted).length === 0) {
      return Promise.resolve(true);
    }

    this.pendingPatch = this.pendingPatch
      ? mergePreferencePatches(this.pendingPatch, compacted)
      : compacted;
    this.pendingFeedback = strongestFeedback(
      this.pendingFeedback,
      options.feedback ?? "silent"
    );
    this.pendingReady = true;
    this.visible = mergePreferences(this.visible, compacted);
    this.emit();

    const result = new Promise<boolean>((resolve) => {
      this.waiters.push(resolve);
    });

    if (this.coalesceTimer) {
      if (!options.coalesce) {
        this.cancelCoalesce();
        void this.drain();
      }
      return result;
    }

    if (options.coalesce) {
      this.coalesceTimer = this.schedule(() => {
        this.coalesceTimer = null;
        void this.drain();
      }, this.coalesceMs);
      return result;
    }

    void this.drain();
    return result;
  };

  /** Force l'envoi de tous les patches en attente et attend leur règlement. */
  flush = async (): Promise<void> => {
    this.cancelCoalesce();
    if (this.pendingPatch) {
      this.pendingReady = true;
    }

    while (this.pendingReady || this.drainPromise) {
      if (this.pendingPatch) {
        this.pendingReady = true;
      }
      if (this.drainPromise) {
        await this.drainPromise;
      } else if (this.pendingReady) {
        await this.drain();
      }
    }
  };

  /** Réinitialise l'état confirmé (changement de session) et annule l'attente. */
  reset = (next: UserPreferences = defaultPreferences): void => {
    this.generation += 1;
    this.cancelCoalesce();
    this.confirmed = next;
    this.visible = next;
    this.pendingPatch = null;
    this.pendingReady = false;
    this.pendingFeedback = "silent";

    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve(false));

    const activeWaiters = this.activeWaiters;
    this.activeWaiters = null;
    activeWaiters?.forEach((resolve) => resolve(false));

    this.emit();
  };

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private notifyEvent(event: PreferencesWriterEvent): void {
    try {
      this.notify(event);
    } catch {
      // Le feedback ne doit jamais interrompre la file d'écriture.
    }
  }

  private cancelCoalesce(): void {
    if (!this.coalesceTimer) return;
    this.coalesceTimer();
    this.coalesceTimer = null;
  }

  private drain(): Promise<void> {
    if (this.drainPromise) return this.drainPromise;

    const run = this.runDrain();
    this.drainPromise = run;
    void run.finally(() => {
      if (this.drainPromise === run) {
        this.drainPromise = null;
      }
      if (this.pendingReady) {
        void this.drain();
      }
    });
    return run;
  }

  private async runDrain(): Promise<void> {
    while (this.pendingReady && this.pendingPatch) {
      const patch = this.pendingPatch;
      const feedback = this.pendingFeedback;
      const generation = this.generation;

      this.pendingPatch = null;
      this.pendingReady = false;
      this.pendingFeedback = "silent";
      this.activeWaiters = this.waiters;
      this.waiters = [];

      try {
        const saved = await this.persist(patch);

        if (generation === this.generation) {
          this.confirmed = saved;
          this.visible = this.pendingPatch
            ? mergePreferences(saved, this.pendingPatch)
            : saved;
          this.emit();
          this.notifyEvent({ type: "saved", preferences: saved, feedback });
        }

        this.resolveActive(true);
      } catch (error) {
        if (generation === this.generation) {
          this.visible = this.pendingPatch
            ? mergePreferences(this.confirmed, this.pendingPatch)
            : this.confirmed;
          this.emit();
          this.notifyEvent({ type: "failed", error, feedback });
        }

        this.resolveActive(false);
      }
    }
  }

  private resolveActive(saved: boolean): void {
    const waiters = this.activeWaiters;
    this.activeWaiters = null;
    waiters?.forEach((resolve) => resolve(saved));
  }
}
