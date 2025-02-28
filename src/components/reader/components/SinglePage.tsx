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
}

export const SinglePage = ({
  pageUrl,
  pageNumber,
  isLoading,
  onLoad,
  isDoublePage = false,
  isRTL = false,
  order = "first",
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
        <img
          src={pageUrl}
          alt={`Page ${pageNumber}`}
          className={cn(
            "max-h-full w-auto object-contain transition-opacity duration-300",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => onLoad(pageNumber)}
        />
      )}
    </div>
  );
};
