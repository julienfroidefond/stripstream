import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface PageInputProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const PageInput = ({ currentPage, totalPages, onPageChange }: PageInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPage.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleGoToPage();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(currentPage.toString());
    }
  };

  const handleGoToPage = () => {
    if (isValid) {
      onPageChange(parsedValue);
      setIsEditing(false);
    }
  };

  const handleClick = () => {
    setIsEditing(true);
    setInputValue(currentPage.toString());
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Ne pas fermer si on clique sur le bouton "Aller à"
    if (e.relatedTarget?.getAttribute("data-action") === "goto") {
      return;
    }
    setIsEditing(false);
    setInputValue(currentPage.toString());
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accepter toute saisie numérique pendant la frappe ;
    // la validation borne min/max se fait au submit.
    setInputValue(e.target.value.replace(/[^0-9]/g, ""));
  };

  const parsedValue = parseInt(inputValue, 10);
  const isValid =
    inputValue !== "" && !isNaN(parsedValue) && parsedValue >= 1 && parsedValue <= totalPages;

  return (
    <div
      className="relative flex items-center gap-1"
      role="group"
      data-testid="reader-page-navigation"
      aria-label="Navigation par numéro de page"
    >
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleChange}
            className={cn(
              "w-12 bg-background/70 backdrop-blur-md text-center rounded-md py-1 px-2",
              "focus:outline-hidden focus:ring-2",
              "text-sm text-foreground",
              isValid || inputValue === ""
                ? "focus:ring-primary"
                : "ring-2 ring-destructive focus:ring-destructive"
            )}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            aria-label="Entrez un numéro de page"
            aria-invalid={inputValue !== "" && !isValid}
          />
          <button
            onClick={handleGoToPage}
            disabled={!isValid}
            data-action="goto"
            className="p-1 rounded-md bg-background/70 backdrop-blur-md hover:bg-background/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background/70"
            aria-label="Aller à cette page"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          onClick={handleClick}
          className="text-sm text-foreground/80 hover:text-foreground transition-colors"
          tabIndex={0}
          aria-label="Cliquez pour naviguer vers une page spécifique"
        >
          {currentPage}/{totalPages}
        </button>
      )}
    </div>
  );
};
