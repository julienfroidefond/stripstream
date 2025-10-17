"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScrollContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  showArrows?: boolean;
  scrollAmount?: number;
  arrowLeftLabel?: string;
  arrowRightLabel?: string;
}

const ScrollContainer = React.forwardRef<HTMLDivElement, ScrollContainerProps>(
  (
    {
      children,
      className,
      showArrows = true,
      scrollAmount = 400,
      arrowLeftLabel = "Scroll left",
      arrowRightLabel = "Scroll right",
      ...props
    },
    ref
  ) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = React.useState(false);
    const [showRightArrow, setShowRightArrow] = React.useState(true);

    const handleScroll = React.useCallback(() => {
      if (!scrollContainerRef.current) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }, []);

    const scroll = React.useCallback(
      (direction: "left" | "right") => {
        if (!scrollContainerRef.current) return;

        const scrollValue = direction === "left" ? -scrollAmount : scrollAmount;
        scrollContainerRef.current.scrollBy({ left: scrollValue, behavior: "smooth" });
      },
      [scrollAmount]
    );

    React.useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      handleScroll();

      const resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, [handleScroll]);

    return (
      <div className="relative" ref={ref}>
        {showArrows && showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/90 shadow-md border transition-opacity hover:bg-accent"
            aria-label={arrowLeftLabel}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={cn(
            "flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4",
            className
          )}
          {...props}
        >
          {children}
        </div>

        {showArrows && showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-background/90 shadow-md border transition-opacity hover:bg-accent"
            aria-label={arrowRightLabel}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>
    );
  }
);

ScrollContainer.displayName = "ScrollContainer";

export { ScrollContainer };

