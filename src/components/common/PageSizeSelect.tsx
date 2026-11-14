import { LayoutList } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getGridPageSizeOptions, normalizeGridPageSize } from "@/lib/collections/page-size";

interface PageSizeSelectProps {
  pageSize: number;
  isCompact: boolean;
  onSizeChange: (size: number) => Promise<void> | void;
  className?: string;
}

export function PageSizeSelect({
  pageSize,
  isCompact,
  onSizeChange,
  className,
}: PageSizeSelectProps) {
  const options = getGridPageSizeOptions(isCompact);

  const handleChange = async (rawValue: string) => {
    const size = parseInt(rawValue);
    await onSizeChange(size);
  };

  return (
    <Select
      value={normalizeGridPageSize(pageSize, isCompact).toString()}
      onValueChange={handleChange}
    >
      <SelectTrigger
        className={cn(
          "h-9 w-[96px] rounded-full border border-border bg-surface-1 text-xs font-medium sm:text-sm",
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
