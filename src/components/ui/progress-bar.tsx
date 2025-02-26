interface ProgressBarProps {
  progress: number;
  total: number;
  type: "series" | "book";
}

export function ProgressBar({ progress, total, type }: ProgressBarProps) {
  const percentage = Math.round((progress / total) * 100);
  
  const barColor = type === "series" 
    ? "bg-gradient-to-r from-purple-500 to-pink-500" 
    : "bg-gradient-to-r from-blue-500 to-cyan-500";
  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-black/50 backdrop-blur-sm border-t border-white/10">
      <div className="h-2 bg-white/30 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
