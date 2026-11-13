"use server";

import { headers } from "next/headers";
import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { runAction, ActionError, type ActionResult } from "@/lib/actions/action-runner";
import { isRegistrationEnabled } from "@/lib/registration";
import { clientIpFromHeaders } from "@/lib/client-ip";

/**
 * Inscrit un nouvel utilisateur. Fermée par défaut : sans
 * `REGISTRATION_ENABLED=true`, l'action échoue en `AUTH_REGISTRATION_DISABLED`
 * avant toute écriture (ADR 0032). Action anonyme : faute de session pour
 * indexer le budget du runner, les budgets par IP et par email et la
 * vérification de robustesse restent dans `AuthServerService.registerUser`.
 */
export async function registerUser(email: string, password: string): Promise<ActionResult> {
  return runAction({
    name: "registerUser",
    fallbackCode: ERROR_CODES.AUTH.REGISTRATION_FAILED,
    guard: () => {
      if (!isRegistrationEnabled()) {
        throw new ActionError(ERROR_CODES.AUTH.REGISTRATION_DISABLED);
      }
    },
    execute: async () => {
      const clientIp = clientIpFromHeaders(await headers());
      await AuthServerService.registerUser(email, password, clientIp);
      return { message: "Inscription réussie" };
    },
  });
}
