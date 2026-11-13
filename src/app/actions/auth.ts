"use server";

import { AuthServerService } from "@/lib/services/auth-server.service";
import { ERROR_CODES } from "@/constants/errorCodes";
import { runAction, type ActionResult } from "@/lib/actions/action-runner";

/**
 * Inscrit un nouvel utilisateur. Action anonyme : faute de session pour
 * indexer le budget, le rate-limit par adresse email et la vérification de
 * robustesse restent dans `AuthServerService.registerUser`.
 */
export async function registerUser(email: string, password: string): Promise<ActionResult> {
  return runAction({
    name: "registerUser",
    fallbackCode: ERROR_CODES.AUTH.REGISTRATION_FAILED,
    execute: async () => {
      await AuthServerService.registerUser(email, password);
      return { message: "Inscription réussie" };
    },
  });
}
