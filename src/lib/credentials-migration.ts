import { encryptSecret, isEncryptedSecret, isEncryptionConfigured } from "./credentials";

/**
 * Planification de la migration des identifiants déjà stockés en clair.
 *
 * La logique est volontairement pure (pas d'accès base) pour rester testable :
 * `planCredentialEncryption` décide des lignes à ré-écrire, le script
 * `scripts/encrypt-credentials.ts` applique les écritures via Prisma.
 *
 * Idempotence : une ligne déjà au format `enc:v1:` est ignorée. Rejouer la
 * migration ne réécrit donc rien et ne ré-encrypte jamais un ciphertext.
 */
export interface CredentialRecord {
  id: number;
  value: string;
}

export interface CredentialEncryptionPlan {
  /** `false` quand `CREDENTIALS_ENCRYPTION_KEY` est absente : rien ne peut être chiffré. */
  enabled: boolean;
  /** Lignes à ré-écrire avec leur nouvelle valeur chiffrée. */
  updates: CredentialRecord[];
  /** Lignes déjà chiffrées, laissées intactes. */
  alreadyEncrypted: number;
  /** Lignes en clair laissées telles quelles faute de clé. */
  pendingWithoutKey: number;
}

export function planCredentialEncryption(
  records: CredentialRecord[]
): CredentialEncryptionPlan {
  const enabled = isEncryptionConfigured();
  const updates: CredentialRecord[] = [];
  let alreadyEncrypted = 0;
  let pendingWithoutKey = 0;

  for (const record of records) {
    if (isEncryptedSecret(record.value)) {
      alreadyEncrypted += 1;
      continue;
    }
    if (!enabled) {
      pendingWithoutKey += 1;
      continue;
    }
    updates.push({ id: record.id, value: encryptSecret(record.value) });
  }

  return { enabled, updates, alreadyEncrypted, pendingWithoutKey };
}
