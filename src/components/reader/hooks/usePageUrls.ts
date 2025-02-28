import { useState, useEffect } from "react";

interface UsePageUrlsProps {
  currentPage: number;
  isDoublePage: boolean;
  shouldShowDoublePage: (page: number) => boolean;
  getPageUrl: (page: number) => Promise<string>;
  setIsLoading: (loading: boolean) => void;
  setSecondPageLoading: (loading: boolean) => void;
}

export const usePageUrls = ({
  currentPage,
  isDoublePage,
  shouldShowDoublePage,
  getPageUrl,
  setIsLoading,
  setSecondPageLoading,
}: UsePageUrlsProps) => {
  const [currentPageUrl, setCurrentPageUrl] = useState<string>("");
  const [nextPageUrl, setNextPageUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const loadPageUrls = async () => {
      try {
        const url = await getPageUrl(currentPage);
        if (isMounted) {
          setCurrentPageUrl(url);
          setIsLoading(false);
        }

        if (isDoublePage && shouldShowDoublePage(currentPage)) {
          const nextUrl = await getPageUrl(currentPage + 1);
          if (isMounted) {
            setNextPageUrl(nextUrl);
            setSecondPageLoading(false);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error(
            `Erreur de chargement des URLs pour la page ${currentPage}:`,
            error.message
          );
        }
        if (isMounted) {
          setIsLoading(false);
          setSecondPageLoading(false);
        }
      }
    };

    setIsLoading(true);
    setSecondPageLoading(true);
    loadPageUrls();

    return () => {
      isMounted = false;
    };
  }, [
    currentPage,
    isDoublePage,
    shouldShowDoublePage,
    getPageUrl,
    setIsLoading,
    setSecondPageLoading,
  ]);

  return {
    currentPageUrl,
    nextPageUrl,
  };
};
