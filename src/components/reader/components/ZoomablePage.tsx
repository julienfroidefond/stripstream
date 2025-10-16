import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ZoomablePageProps {
  pageUrl: string | null;
  pageNumber: number;
  isLoading: boolean;
  onLoad: (pageNumber: number) => void;
  isDoublePage?: boolean;
  isRTL?: boolean;
  order?: "first" | "second";
  onZoomChange?: (isZoomed: boolean) => void;
}

export const ZoomablePage = ({
  pageUrl,
  pageNumber,
  isLoading,
  onLoad,
  isDoublePage = false,
  isRTL = false,
  order = "first",
  onZoomChange,
}: ZoomablePageProps) => {
  const [currentScale, setCurrentScale] = useState(1);

  const handleTransform = (ref: any, state: { scale: number; positionX: number; positionY: number }) => {
    setCurrentScale(state.scale);
    onZoomChange?.(state.scale > 1.1);
  };
  return (
    <div
      className={cn(
        "relative h-full flex items-center",
        isDoublePage && {
          "w-1/2": true,
          "order-2 justify-start": order === "first" ? isRTL : !isRTL,
          "order-1 justify-end": order === "first" ? !isRTL : isRTL,
        },
        !isDoublePage && "w-full justify-center"
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {pageUrl && (
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={4}
          centerOnInit={true}
          wheel={{ step: 1.5 }}
          pinch={{ step: 1 }}
          doubleClick={{ 
            disabled: false,
            step: 1,
            animationTime: 200,
            animationType: "easeOut"
          }}
          panning={{ disabled: false }}
          limitToBounds={true}
          centerZoomedOut={false}
          onTransformed={handleTransform}
        >
          <TransformComponent
            wrapperClass="w-full h-full flex items-center justify-center"
            contentClass="cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pageUrl}
              alt={`Page ${pageNumber}`}
              className={cn(
                "max-h-full w-auto object-contain",
                isLoading ? "opacity-0" : "opacity-100"
              )}
              onLoad={() => onLoad(pageNumber)}
            />
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  );
};
