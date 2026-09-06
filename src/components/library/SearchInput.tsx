import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { debounce } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  testId?: string;
}

export const SearchInput = ({ placeholder, testId }: SearchInputProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = debounce((term: string) => {
    startTransition(() => {
      const query = createQueryString("search", term);
      router.push(`?${query}`);
    });
  }, 300);

  return (
    <div className="relative w-full rounded-2xl border border-border/60 bg-[linear-gradient(140deg,hsl(var(--background)/0.72),hsl(var(--background)/0.5))] px-1 shadow-sm backdrop-blur-sm transition-colors focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-2xl">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        data-testid={testId}
        type={isPending ? "text" : "search"}
        placeholder={placeholder}
        className="h-12 rounded-xl border-0 bg-transparent pl-10 pr-10 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => handleSearch(e.target.value)}
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
