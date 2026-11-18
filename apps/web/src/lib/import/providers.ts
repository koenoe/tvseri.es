/**
 * Service names from a file ("Apple TV+", "netflix ") against the region's
 * providers ("Apple TV"): case, trailing "+" and spaces are ignored.
 */
const key = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[+\s]+$/, '');

export const matchProvider = <T extends Readonly<{ name?: string }>>(
  name: string | undefined,
  providers: ReadonlyArray<T>,
): T | null => {
  const wanted = key(name ?? '');
  if (!wanted) {
    return null;
  }
  return providers.find((p) => p.name && key(p.name) === wanted) ?? null;
};
