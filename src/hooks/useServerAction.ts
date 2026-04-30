"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useTranslate } from "@/hooks/useTranslate";

/**
 * Forme attendue d'un retour de server action standard du projet.
 */
export interface ServerActionResult {
  success: boolean;
  message?: string;
}

interface UseServerActionOptions {
  /** Titre du toast d'erreur. Par défaut : "common.error". */
  errorTitle?: string;
  /** Si fourni, un toast de succès est émis avec ce titre. */
  successTitle?: string;
  /** Hook custom de log en cas d'échec (en plus du toast). */
  onError?: (message: string | undefined) => void;
}

/**
 * Wrappe une server action retournant `{ success, message }` et toast
 * automatiquement quand `success === false`. Évite d'oublier le retour utilisateur
 * à chaque appel d'action.
 *
 * Usage :
 * ```tsx
 * const addFav = useServerAction(addToFavorites);
 * await addFav(seriesId); // toast d'erreur si KO, silencieux si OK
 *
 * const saveCfg = useServerAction(saveKomgaConfig, { successTitle: "Sauvegardé" });
 * await saveCfg({ name, url, ... });
 * ```
 */
export function useServerAction<
  TArgs extends unknown[],
  TResult extends ServerActionResult,
>(action: (...args: TArgs) => Promise<TResult>, options?: UseServerActionOptions) {
  const { toast } = useToast();
  const { t } = useTranslate();

  return useCallback(
    async (...args: TArgs): Promise<TResult> => {
      const result = await action(...args);
      if (!result.success) {
        toast({
          variant: "destructive",
          title: options?.errorTitle ?? t("common.error"),
          description: result.message ?? t("errors.GENERIC_ERROR"),
        });
        options?.onError?.(result.message);
      } else if (options?.successTitle) {
        toast({
          title: options.successTitle,
          description: result.message,
        });
      }
      return result;
    },
    [action, options, toast, t]
  );
}
