import { cn } from "@/lib/utils";
import { ImageLoader } from "@/components/ui/image-loader";

interface SinglePageProps {
  pageUrl: string;
  pageNumber: number;
  isLoading: boolean;
  onLoad: (pageNumber: number) => void;
  isDoublePage?: boolean;
  isRTL?: boolean;
  order?: "first" | "second";
  zoomLevel?: number;
  panPosition?: { x: number; y: number };
  onDoubleClick?: () => void;
}

export const SinglePage = ({
  pageUrl,
  pageNumber,
  isLoading,
  onLoad,
  isDoublePage = false,
  isRTL = false,
  order = "first",
  zoomLevel = 1,
  panPosition = { x: 0, y: 0 },
  onDoubleClick,
}: SinglePageProps) => {
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
      <ImageLoader isLoading={isLoading} />
      {pageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pageUrl}
          style={{
            transform: `scale(${zoomLevel}) translate(${panPosition.x}px, ${panPosition.y}px)`,
            transformOrigin: "center",
            transition: zoomLevel === 1 ? "transform 0.3s ease-out" : "none",
            cursor: "pointer",
          }}
          alt={`Page ${pageNumber}`}
          className={cn(
            "max-h-full w-auto object-contain",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => onLoad(pageNumber)}
          onDoubleClick={onDoubleClick}
        />
      )}
    </div>
  );
};
