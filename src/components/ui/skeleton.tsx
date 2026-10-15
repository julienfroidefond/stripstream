import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} {...props} />; // taste-skill-ignore: placeholder de chargement
}

export { Skeleton };
