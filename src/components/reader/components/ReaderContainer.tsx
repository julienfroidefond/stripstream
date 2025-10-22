import { useRef, useCallback } from "react";

interface ReaderContainerProps {
  children: React.ReactNode;
  onContainerClick: (e: React.MouseEvent) => void;
}

export function ReaderContainer({ children, onContainerClick }: ReaderContainerProps) {
  const readerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    onContainerClick(e);
  }, [onContainerClick]);

  return (
    <div
      ref={readerRef}
      className="reader-zoom-enabled fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-hidden"
      onClick={handleContainerClick}
    >
      <div className="relative h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
