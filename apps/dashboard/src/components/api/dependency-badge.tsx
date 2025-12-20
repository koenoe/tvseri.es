function DependencyBadge({ name }: Readonly<{ name: string }>) {
  return (
    <span className="flex h-5 shrink-0 items-center justify-center rounded border border-border px-1.5 text-xs text-muted-foreground">
      {name}
    </span>
  );
}

export { DependencyBadge };
