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

interface PageSizeSelectProps {
  onSizeChange?: (size: number) => void;
  pageSize?: number;
  className?: string;
}

function PageSizeSelectBase({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (size: number) => Promise<void> | void;
  className?: string;
}) {
  const handleChange = async (rawValue: string) => {
    const size = parseInt(rawValue);
    await onChange(size);
  };

  return (
    <Select value={value.toString()} onValueChange={handleChange}>
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
        <SelectItem value="20">20</SelectItem>
        <SelectItem value="50">50</SelectItem>
        <SelectItem value="100">100</SelectItem>
      </SelectContent>
    </Select>
  );
}

function PageSizeSelectUncontrolled({
  onSizeChange,
  className,
}: Pick<PageSizeSelectProps, "onSizeChange" | "className">) {
  const { itemsPerPage, handlePageSizeChange } = useDisplayPreferences();

  const onChange = async (size: number) => {
    await handlePageSizeChange(size);
    onSizeChange?.(size);
  };

  return <PageSizeSelectBase value={itemsPerPage} onChange={onChange} className={className} />;
}

export function PageSizeSelect({ onSizeChange, pageSize, className }: PageSizeSelectProps) {
  const isControlled = typeof pageSize === "number" && typeof onSizeChange === "function";

  if (isControlled) {
    return <PageSizeSelectBase value={pageSize} onChange={onSizeChange} className={className} />;
  }

  return <PageSizeSelectUncontrolled onSizeChange={onSizeChange} className={className} />;
}
