import { ZoomablePage } from "./ZoomablePage";

interface ReaderContentProps {
  currentPage: number;
  currentPageUrl: string;
  nextPageUrl: string;
  isLoading: boolean;
  secondPageLoading: boolean;
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  isRTL: boolean;
  onThumbnailLoad: (pageNumber: number) => void;
  onZoomChange?: (isZoomed: boolean) => void;
}

export const ReaderContent = ({
  currentPage,
  currentPageUrl,
  nextPageUrl,
  isLoading,
  secondPageLoading,
  isDoublePage,
  shouldShowDoublePage,
  isRTL,
  onThumbnailLoad,
  onZoomChange,
}: ReaderContentProps) => {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden p-1">
      <div className="relative w-full h-[calc(100vh-2rem)] flex items-center justify-center gap-0">
        <ZoomablePage
          pageUrl={currentPageUrl}
          pageNumber={currentPage}
          isLoading={isLoading}
          onLoad={onThumbnailLoad}
          isDoublePage={isDoublePage}
          isRTL={isRTL}
          order="first"
          onZoomChange={onZoomChange}
        />

        {isDoublePage && shouldShowDoublePage(currentPage) && (
          <ZoomablePage
            pageUrl={nextPageUrl}
            pageNumber={currentPage + 1}
            isLoading={secondPageLoading}
            onLoad={onThumbnailLoad}
            isDoublePage={true}
            isRTL={isRTL}
            order="second"
            onZoomChange={onZoomChange}
          />
        )}
      </div>
    </div>
  );
};
