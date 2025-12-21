import { memo } from 'react';

type MethodBadgeProps = Readonly<{
  method: string;
}>;

const MethodBadge = memo(function MethodBadge({ method }: MethodBadgeProps) {
  return (
    <span className="flex h-4 shrink-0 items-center justify-center rounded bg-muted px-1 text-[10px] text-muted-foreground">
      {method}
    </span>
  );
});

MethodBadge.displayName = 'MethodBadge';

type RouteLabelProps = Readonly<{
  route: string;
}>;

const RouteLabel = memo(function RouteLabel({ route }: RouteLabelProps) {
  const parts = route.split(/(\[[^\]]+\]|:[^/]+|\*)/g).filter(Boolean);

  return (
    <span className="truncate">
      {parts.map((part, index) => {
        const isDynamic =
          part.startsWith('[') || part.startsWith(':') || part === '*';
        return isDynamic ? (
          <span
            className="rounded bg-muted/50 px-1 py-0.5 font-mono text-muted-foreground"
            key={index}
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
});

RouteLabel.displayName = 'RouteLabel';

function parseEndpoint(endpoint: string): { method: string; route: string } {
  const [method = '', ...pathParts] = endpoint.split(' ');
  const route = pathParts.join(' ');
  return { method, route: route || endpoint };
}

export { MethodBadge, parseEndpoint, RouteLabel };
