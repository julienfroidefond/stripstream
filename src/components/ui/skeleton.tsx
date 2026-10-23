import { cn } from "@/lib/utils";

/**
 * `skeleton-reveal` retient le squelette un court instant avant de le
 * montrer, puis le fait pulser : un chargement rapide passe directement au
 * contenu, sans flash gris (voir `globals.css`).
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton-reveal rounded-md bg-surface-2", className)} {...props} />; // taste-skill-ignore: placeholder de chargement
}

export { Skeleton };
