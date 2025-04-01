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
}

export function PageSizeSelect({ onSizeChange }: PageSizeSelectProps) {
  const { itemsPerPage, handlePageSizeChange } = useDisplayPreferences();

  const handleChange = async (value: string) => {
    const size = parseInt(value);
    await handlePageSizeChange(size);
    onSizeChange?.(size);
  };

  return (
    <Select value={itemsPerPage.toString()} onValueChange={handleChange}>
      <SelectTrigger className="w-[80px]">
        <LayoutList className="h-4 w-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="20">20</SelectItem>
        <SelectItem value="50">50</SelectItem>
        <SelectItem value="100">100</SelectItem>
      </SelectContent>
    </Select>
  );
}
