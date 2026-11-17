import { memo } from 'react';

// Dynamic segments: [param], :param or *.
const SEGMENT_PATTERN = /(\[[^\]]+\]|:[^/]+|\*)/g;

function isDynamicSegment(part: string): boolean {
  return part.startsWith('[') || part.startsWith(':') || part === '*';
}

type RouteLabelProps = Readonly<{
  className?: string;
  /** Classes of the dynamic segments, which read as placeholders. */
  dynamicClassName?: string;
  route: string;
}>;

const RouteLabel = memo(function RouteLabel({
  className = 'truncate',
  dynamicClassName = 'rounded bg-muted/50 px-1 py-0.5 font-mono text-muted-foreground',
  route,
}: RouteLabelProps) {
  const parts = route.split(SEGMENT_PATTERN).filter(Boolean);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        isDynamicSegment(part) ? (
          <span className={dynamicClassName} key={index}>
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </span>
  );
});

RouteLabel.displayName = 'RouteLabel';

export { RouteLabel };
