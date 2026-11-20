import { plural } from '@tvseri.es/utils';

/**
 * The Streaming services row's line: where, then what ("United Kingdom ·
 * 6 services"); one service by its name. Pure, so the server's hole and the
 * tests share it.
 */
export function servicesLine(
  region: string | null,
  services: ReadonlyArray<Readonly<{ name: string }>>,
): string {
  const [only] = services;
  if (!region && !only) {
    return 'Pick your country and services';
  }
  const what =
    services.length === 0
      ? 'none picked yet'
      : services.length === 1 && only
        ? only.name
        : plural(services.length, 'service');
  return region ? `${region} · ${what}` : what;
}
