import { useDisplayPreferences } from "@/hooks/useDisplayPreferences";
import { LayoutList } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageSizeSelectProps {
  onSizeChange?: (size: number) => void;
  pageSize?: number;
}

function PageSizeSelectBase({
  value,
  onChange,
}: {
  value: number;
  onChange: (size: number) => Promise<void> | void;
}) {
  const handleChange = async (rawValue: string) => {
    const size = parseInt(rawValue);
    await onChange(size);
  };

  return (
    <Select value={value.toString()} onValueChange={handleChange}>
      <SelectTrigger className="w-[80px]">
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

function PageSizeSelectUncontrolled({ onSizeChange }: Pick<PageSizeSelectProps, "onSizeChange">) {
  const { itemsPerPage, handlePageSizeChange } = useDisplayPreferences();

  const onChange = async (size: number) => {
    await handlePageSizeChange(size);
    onSizeChange?.(size);
  };

  return <PageSizeSelectBase value={itemsPerPage} onChange={onChange} />;
}

export function PageSizeSelect({ onSizeChange, pageSize }: PageSizeSelectProps) {
  const isControlled = typeof pageSize === "number" && typeof onSizeChange === "function";

  if (isControlled) {
    return <PageSizeSelectBase value={pageSize} onChange={onSizeChange} />;
  }

  return <PageSizeSelectUncontrolled onSizeChange={onSizeChange} />;
}
