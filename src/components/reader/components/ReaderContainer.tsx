import { useRef, useCallback } from "react";
import type { ReaderBackground } from "@/types/preferences";
import { cn } from "@/lib/utils";

interface ReaderContainerProps {
  children: React.ReactNode;
  onContainerClick: (e: React.MouseEvent) => void;
  background: ReaderBackground;
}

const backgroundClassNames: Record<ReaderBackground, string> = {
  default:
    "bg-[radial-gradient(90%_70%_at_50%_8%,hsl(var(--primary)/0.1),transparent_50%),linear-gradient(to_bottom,hsl(var(--background)/0.97),hsl(var(--background)/0.93)_40%,hsl(var(--background)))]",
  black: "bg-[#09090b]",
  white: "bg-white",
  cream: "bg-[#f4ead8]",
};

export function ReaderContainer({ children, onContainerClick, background }: ReaderContainerProps) {
  const readerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      onContainerClick(e);
    },
    [onContainerClick]
  );

  return (
    <div
      ref={readerRef}
      className={cn(
        "reader-zoom-enabled fixed inset-0 z-50 overflow-hidden backdrop-blur-sm",
        backgroundClassNames[background]
      )}
      onClick={handleContainerClick}
    >
      <div className="relative h-full w-full flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
