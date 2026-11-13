import { connectionDescriptor } from "@/lib/connections/descriptors";
import type { ProviderType } from "@/lib/providers/types";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  default: "px-2 py-0.5 text-xs",
  compact: "shrink-0 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
} as const;

/** Badge du type de connexion ; libellé et couleurs viennent du descripteur. */
export function ConnectionTypeBadge({
  provider,
  size = "default",
}: {
  provider: ProviderType;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const descriptor = connectionDescriptor(provider);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full",
        SIZE_CLASSES[size],
        descriptor.badgeClassName
      )}
    >
      {descriptor.label}
    </span>
  );
}
