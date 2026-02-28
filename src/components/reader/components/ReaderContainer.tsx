import { useRef, useCallback } from "react";

interface ReaderContainerProps {
  children: React.ReactNode;
  onContainerClick: (e: React.MouseEvent) => void;
}

export function ReaderContainer({ children, onContainerClick }: ReaderContainerProps) {
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
      className="reader-zoom-enabled fixed inset-0 z-50 overflow-hidden bg-[radial-gradient(90%_70%_at_50%_8%,hsl(var(--primary)/0.1),transparent_50%),linear-gradient(to_bottom,hsl(var(--background)/0.97),hsl(var(--background)/0.93)_40%,hsl(var(--background)))] backdrop-blur-sm"
      onClick={handleContainerClick}
    >
      <div className="relative h-full flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
