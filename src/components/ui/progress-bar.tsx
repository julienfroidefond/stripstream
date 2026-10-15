interface ProgressBarProps {
  progress: number;
  total: number;
  type: "series" | "book";
}

export function ProgressBar({ progress, total, type }: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  // Scrim neutre au-dessus de la couverture : pas de dégradé, un seul accent.
  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-black/75">
      <div
        className="h-1.5 bg-white/25 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={type === "series" ? "Progression de la série" : "Progression du tome"}
      >
        <div
          className="h-full rounded-full bg-[hsl(187_72%_58%)] transition-[width] duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
