import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
): (...args: TArgs) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: TArgs) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Applique `worker` à chaque élément de `items` en gardant au plus
 * `concurrency` appels en vol. Les erreurs unitaires sont comptées, jamais
 * propagées : l'appelant reçoit un décompte succès/échec pour un retour
 * « X / Y » côté UI.
 */
export async function runWithConcurrency<TItem>(
  items: readonly TItem[],
  concurrency: number,
  worker: (item: TItem, index: number) => Promise<void>
): Promise<{ succeeded: number; failed: number }> {
  const total = items.length;
  const tally = { succeeded: 0, failed: 0 };
  if (total === 0) return tally;

  const limit = Math.max(1, Math.min(concurrency, total));
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < total) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      try {
        await worker(items[currentIndex], currentIndex);
        tally.succeeded += 1;
      } catch {
        tally.failed += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: limit }, () => runWorker()));
  return tally;
}
