import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';

type StatusHeaderProps = Readonly<{
  Icon: LucideIcon;
  label: string;
  showFontMedium?: boolean;
  textColorClass: string;
  threshold: string;
}>;

function StatusHeaderComponent({
  Icon,
  label,
  showFontMedium = true,
  textColorClass,
  threshold,
}: StatusHeaderProps) {
  const fontWeight = showFontMedium ? 'font-medium ' : '';

  return (
    <>
      <span
        className={`flex items-center gap-1.5 whitespace-nowrap ${fontWeight}${textColorClass}`}
      >
        <Icon className="size-4" />
        {label}
      </span>
      <span className="whitespace-nowrap text-sm text-muted-foreground">
        {threshold}
      </span>
    </>
  );
}

StatusHeaderComponent.displayName = 'StatusHeader';
export const StatusHeader = memo(StatusHeaderComponent);
