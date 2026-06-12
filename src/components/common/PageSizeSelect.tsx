import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { LayoutList } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getGridPageSizeOptions, normalizeGridPageSize } from "@/lib/pageSize";

interface PageSizeSelectProps {
  onSizeChange?: (size: number) => void;
  pageSize?: number;
  className?: string;
  isCompact?: boolean;
}

function PageSizeSelectBase({
  value,
  onChange,
  isCompact,
  className,
}: {
  value: number;
  onChange: (size: number) => Promise<void> | void;
  isCompact: boolean;
  className?: string;
}) {
  const options = getGridPageSizeOptions(isCompact);

  const handleChange = async (rawValue: string) => {
    const size = parseInt(rawValue);
    await onChange(size);
  };

  return (
    <Select value={normalizeGridPageSize(value, isCompact).toString()} onValueChange={handleChange}>
      <SelectTrigger
        className={cn(
          "h-9 w-[96px] rounded-full border border-border/60 bg-background/40 text-xs font-medium backdrop-blur-sm sm:text-sm",
          className
        )}
      >
        <LayoutList className="h-4 w-4" />
        <SelectValue className="ml-2" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option.toString()}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PageSizeSelectUncontrolled({
  onSizeChange,
  className,
  isCompact,
}: Pick<PageSizeSelectProps, "onSizeChange" | "className" | "isCompact">) {
  const {
    isCompact: preferenceIsCompact,
    itemsPerPage,
    handlePageSizeChange,
  } = useDisplayPreferences();
  const effectiveCompact = isCompact ?? preferenceIsCompact;

  const onChange = async (size: number) => {
    await handlePageSizeChange(size);
    onSizeChange?.(size);
  };

  return (
    <PageSizeSelectBase
      value={itemsPerPage}
      onChange={onChange}
      isCompact={effectiveCompact}
      className={className}
    />
  );
}

export function PageSizeSelect({
  onSizeChange,
  pageSize,
  className,
  isCompact,
}: PageSizeSelectProps) {
  const isControlled = typeof pageSize === "number" && typeof onSizeChange === "function";

  if (isControlled) {
    return (
      <PageSizeSelectBase
        value={pageSize}
        onChange={onSizeChange}
        isCompact={Boolean(isCompact)}
        className={className}
      />
    );
  }

  return (
    <PageSizeSelectUncontrolled
      onSizeChange={onSizeChange}
      className={className}
      isCompact={isCompact}
    />
  );
}
