import { useTranslate } from "@/hooks/useTranslate";

interface EndOfSeriesModalProps {
  show: boolean;
  onClose: (currentPage: number) => void;
  currentPage: number;
}

export function EndOfSeriesModal({ show, onClose, currentPage }: EndOfSeriesModalProps) {
  const { t } = useTranslate();

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
      <div className="bg-background/80 backdrop-blur-md border rounded-lg shadow-lg p-6 max-w-md text-center">
        <h3 className="text-lg font-semibold mb-2">{t("reader.endOfSeries")}</h3>
        <p className="text-muted-foreground mb-4">{t("reader.endOfSeriesMessage")}</p>
        <button
          onClick={() => onClose(currentPage)}
          className="px-4 py-2 bg-primary/90 backdrop-blur-md text-primary-foreground rounded-md hover:bg-primary/80 transition-colors"
        >
          {t("reader.backToSeries")}
        </button>
      </div>
    </div>
  );
}
