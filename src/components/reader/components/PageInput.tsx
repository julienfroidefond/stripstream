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
    const value = parseInt(inputValue);
    if (!isNaN(value) && value >= 1 && value <= totalPages) {
      onPageChange(value);
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
    // Ne garder que les chiffres
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value === "" || (parseInt(value) >= 1 && parseInt(value) <= totalPages)) {
      setInputValue(value);
    }
  };

  return (
    <div
      className="relative flex items-center gap-1"
      role="group"
      aria-label="Navigation par numéro de page"
    >
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            className={cn(
              "w-12 bg-background/50 text-center rounded-md py-1 px-2",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "text-sm text-foreground"
            )}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            aria-label="Entrez un numéro de page"
          />
          <button
            onClick={handleGoToPage}
            data-action="goto"
            className="p-1 rounded-md bg-background/50 hover:bg-background/80 transition-colors"
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
          {currentPage}
        </button>
      )}
    </div>
  );
};
