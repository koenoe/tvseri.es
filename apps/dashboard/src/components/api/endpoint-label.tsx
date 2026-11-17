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

function parseEndpoint(endpoint: string): { method: string; route: string } {
  const [method = '', ...pathParts] = endpoint.split(' ');
  const route = pathParts.join(' ');
  return { method, route: route || endpoint };
}

export { MethodBadge, parseEndpoint };
