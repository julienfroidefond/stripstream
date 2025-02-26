interface ProgressBarProps {
  progress: number;
  total: number;
}

export function ProgressBar({ progress, total }: ProgressBarProps) {
  const percentage = Math.round((progress / total) * 100);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-black/50 backdrop-blur-sm border-t border-white/10">
      <div className="h-2 bg-white/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
