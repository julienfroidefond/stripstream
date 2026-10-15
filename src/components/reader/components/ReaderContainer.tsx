import { useRef, useCallback } from "react";
import type { ReaderBackground } from "@/types/preferences";
import { cn } from "@/lib/utils";

interface ReaderContainerProps {
  children: React.ReactNode;
  onContainerClick: (e: React.MouseEvent) => void;
  background: ReaderBackground;
}

const backgroundClassNames: Record<ReaderBackground, string> = {
  default: "bg-background",
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
        "reader-zoom-enabled fixed inset-0 z-50 overflow-hidden",
        backgroundClassNames[background]
      )}
      onClick={handleContainerClick}
    >
      <div className="relative h-full w-full flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
