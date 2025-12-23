import { Link } from '@tanstack/react-router';

type DependencyBadgeProps = Readonly<{
  linkable?: boolean;
  name: string;
  source: string;
}>;

function DependencyBadge({ linkable, name, source }: DependencyBadgeProps) {
  const badge = (
    <span className="flex h-5 shrink-0 items-center justify-center rounded border border-border px-1.5 text-xs text-muted-foreground">
      {name}
    </span>
  );

  if (linkable) {
    return (
      <Link
        className="hover:opacity-80 transition-opacity"
        search={{ source }}
        to="/api/dependencies"
      >
        {badge}
      </Link>
    );
  }

  return badge;
}

export { DependencyBadge };
