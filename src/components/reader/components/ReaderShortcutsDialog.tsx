"use client";

import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReaderShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFullscreenAvailable: boolean;
  /** Les flèches sont spatiales : on affiche celles du sens courant. */
  isRTL: boolean;
}

/** Une combinaison = les touches pressées ensemble (`Shift` + `Espace`). */
type KeyChord = string[];

interface ShortcutRow {
  chords: KeyChord[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  rows: ShortcutRow[];
}

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}

function Chords({ chords }: { chords: KeyChord[] }) {
  return (
    <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
      {chords.map((chord, chordIndex) => (
        <span key={chord.join("+")} className="flex items-center gap-1.5">
          {chordIndex > 0 && <span className="text-xs text-muted-foreground">/</span>}
          {chord.map((key, keyIndex) => (
            <span key={key} className="flex items-center gap-1">
              {keyIndex > 0 && <span className="text-xs text-muted-foreground">+</span>}
              <Keycap>{key}</Keycap>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

/**
 * Aide listant les raccourcis du lecteur. Elle doit rester alignée sur
 * `keyboardShortcuts.ts` : toute touche ajoutée au résolveur doit apparaître ici
 * (et inversement).
 */
export function ReaderShortcutsDialog({
  open,
  onOpenChange,
  isFullscreenAvailable,
  isRTL,
}: ReaderShortcutsDialogProps) {
  const { t } = useTranslation();

  // Les flèches restent spatiales : en RTL, « précédent » est à droite.
  const previousArrow = isRTL ? "→" : "←";
  const nextArrow = isRTL ? "←" : "→";

  const groups: ShortcutGroup[] = [
    {
      title: t("reader.shortcuts.groups.navigation"),
      rows: [
        {
          chords: [[previousArrow], ["PageUp"], ["Shift", "Space"]],
          label: t("reader.shortcuts.previousPage"),
        },
        {
          chords: [[nextArrow], ["PageDown"], ["Space"]],
          label: t("reader.shortcuts.nextPage"),
        },
        { chords: [["Home"]], label: t("reader.shortcuts.firstPage") },
        { chords: [["End"]], label: t("reader.shortcuts.lastPage") },
      ],
    },
    {
      title: t("reader.shortcuts.groups.display"),
      rows: [
        ...(isFullscreenAvailable
          ? [{ chords: [["F"]], label: t("reader.shortcuts.fullscreen") }]
          : []),
        { chords: [["D"]], label: t("reader.shortcuts.doublePage") },
        { chords: [["T"]], label: t("reader.shortcuts.thumbnails") },
        { chords: [["I"]], label: t("reader.shortcuts.info") },
        { chords: [["R"]], label: t("reader.shortcuts.direction") },
      ],
    },
    {
      title: t("reader.shortcuts.groups.help"),
      rows: [
        { chords: [["?"]], label: t("reader.shortcuts.help") },
        { chords: [["Esc"]], label: t("reader.shortcuts.close") },
      ],
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="reader-shortcuts-dialog"
        className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:w-[calc(100vw-3rem)] sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-left">{t("reader.shortcuts.title")}</DialogTitle>
          <DialogDescription className="text-left">
            {t("reader.shortcuts.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.rows.map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground/90">{row.label}</span>
                    <Chords chords={row.chords} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{t("reader.shortcuts.hint")}</p>
      </DialogContent>
    </Dialog>
  );
}
