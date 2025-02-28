import { SinglePage } from "./SinglePage";

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
  zoomLevel: number;
  panPosition: { x: number; y: number };
  onDoubleClick: () => void;
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
  zoomLevel,
  panPosition,
  onDoubleClick,
}: ReaderContentProps) => {
  return (
    <div className="relative flex-1 flex items-center justify-center overflow-hidden p-1">
      <div className="relative w-full h-[calc(100vh-2rem)] flex items-center justify-center gap-0">
        <SinglePage
          pageUrl={currentPageUrl}
          pageNumber={currentPage}
          isLoading={isLoading}
          onLoad={onThumbnailLoad}
          isDoublePage={isDoublePage}
          isRTL={isRTL}
          order="first"
          zoomLevel={zoomLevel}
          panPosition={panPosition}
          onDoubleClick={onDoubleClick}
        />

        {isDoublePage && shouldShowDoublePage(currentPage) && (
          <SinglePage
            pageUrl={nextPageUrl}
            pageNumber={currentPage + 1}
            isLoading={secondPageLoading}
            onLoad={onThumbnailLoad}
            isDoublePage={true}
            isRTL={isRTL}
            order="second"
            zoomLevel={zoomLevel}
            panPosition={panPosition}
            onDoubleClick={onDoubleClick}
          />
        )}
      </div>
    </div>
  );
};
