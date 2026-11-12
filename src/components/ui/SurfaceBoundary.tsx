import type { ReactNode } from "react";
import { ERROR_CODES, type ErrorCode } from "@/constants/errorCodes";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type {
  SurfaceContext,
  SurfaceResult,
  SurfaceUnavailableReason,
} from "@/lib/surfaces/surface-loader";

export interface SurfaceBoundaryProps<T> {
  surface: SurfaceResult<T>;
  /** Rend la page uniquement quand le gateway a résolu la donnée. */
  ready: (data: T, context: SurfaceContext) => ReactNode;
  /** Terminal propre à la surface quand aucun provider ne peut la servir. */
  unavailable?: (reason: SurfaceUnavailableReason) => ReactNode;
  /** Terminal propre à la surface en mode anonyme. Par défaut : rien. */
  anonymousEmpty?: (context: SurfaceContext) => ReactNode;
  /** Terminal propre à la surface en erreur. Par défaut : `ErrorMessage`. */
  error?: (code: ErrorCode) => ReactNode;
}

/**
 * Terminal unique des pages data-backed. Les pages ne décident plus elles-mêmes
 * quoi rendre hors de l'état `ready` : le gateway a déjà résolu le contexte et
 * le code d'erreur de repli, la frontière choisit le terminal.
 */
export function SurfaceBoundary<T>({
  surface,
  ready,
  unavailable,
  anonymousEmpty,
  error,
}: SurfaceBoundaryProps<T>) {
  switch (surface.status) {
    case "ready":
      return ready(surface.data, surface.context);
    case "unavailable":
      return unavailable ? (
        unavailable(surface.reason)
      ) : (
        <SurfaceUnavailable reason={surface.reason} />
      );
    case "anonymous-empty":
      return anonymousEmpty ? anonymousEmpty(surface.context) : null;
    case "error":
      return error ? error(surface.code) : <SurfaceError code={surface.code} />;
  }
}

function SurfaceError({ code }: { code: ErrorCode }) {
  return (
    <main className="container mx-auto px-4 py-8">
      <ErrorMessage errorCode={code} />
    </main>
  );
}

function SurfaceUnavailable({ reason }: { reason: SurfaceUnavailableReason }) {
  return (
    <main className="container mx-auto px-4 py-8">
      <ErrorMessage
        errorCode={
          reason === "no-provider"
            ? ERROR_CODES.PROVIDER.NOT_CONFIGURED
            : ERROR_CODES.PROVIDER.UNAVAILABLE
        }
      />
    </main>
  );
}
