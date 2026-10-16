import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useTranslate } from "@/hooks/useTranslate";
import { EASE_PROJECTION } from "@/lib/motion";

interface EndOfSeriesModalProps {
  show: boolean;
  onClose: (currentPage: number) => void;
  currentPage: number;
}

export function EndOfSeriesModal({ show, onClose, currentPage }: EndOfSeriesModalProps) {
  const { t } = useTranslate();

  const reduce = useReducedMotion();

  // Le rideau tombe sur la lecture, puis le carton de fin se lève.
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-of-series-title"
          className="absolute inset-0 flex items-center justify-center bg-background/80 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_PROJECTION }}
        >
          <motion.div
            className="bg-surface-2 rounded-lg p-6 max-w-md text-center"
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.92, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.6, ease: EASE_PROJECTION, delay: reduce ? 0 : 0.1 }}
          >
            <h3 id="end-of-series-title" className="text-lg font-semibold mb-2">{t("reader.endOfSeries")}</h3>
            <p className="text-muted-foreground mb-4">{t("reader.endOfSeriesMessage")}</p>
            <button
              onClick={() => onClose(currentPage)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              {t("reader.backToSeries")}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
