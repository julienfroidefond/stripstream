"use client";

import { Search } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useTransition } from "react";
import { Input } from "@/components/ui/input";

const SEARCH_DEBOUNCE_MS = 300;

interface SearchInputProps {
  placeholder?: string;
  testId?: string;
}

export const SearchInput = ({ placeholder, testId }: SearchInputProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /**
   * Le debounce lit les paramètres au moment du déclenchement : un rendu
   * intermédiaire (spinner, navigation) ne doit pas figer une URL périmée.
   */
  const searchParamsRef = useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParamsRef.current.toString());
      if (term.trim()) {
        params.set("search", term);
      } else {
        params.delete("search");
      }
      // Une recherche repart toujours de la première page : sinon, lancée
      // depuis la page 2+, elle interroge une page inexistante et la grille
      // reste vide.
      params.set("page", "1");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router]
  );

  const handleChange = useCallback(
    (term: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => commit(term), SEARCH_DEBOUNCE_MS);
    },
    [commit]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return (
    <div className="relative w-full rounded-xl border border-border bg-surface-1 px-1 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-2xl">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        data-testid={testId}
        type={isPending ? "text" : "search"}
        placeholder={placeholder}
        className="h-12 rounded-xl border-0 bg-transparent pl-10 pr-10 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        aria-label={placeholder}
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  );
};
