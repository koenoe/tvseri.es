import type { ExtensionPing } from '@/lib/extension/useExtension';

export type ExtensionCta =
  | Readonly<{ kind: 'checking' | 'missing' | 'unsupported' }>
  | Readonly<{ kind: 'installed'; version: string }>
  | Readonly<{ kind: 'outdated'; latest: string; version: string }>;

/**
 * Nudges an update only when the build is too old to connect one of
 * `services`, never just for being behind `latest`: Chrome updates it itself.
 */
export function extensionCta(
  ping: ExtensionPing,
  services: ReadonlyArray<string>,
  latest: string,
): ExtensionCta {
  if (ping.state !== 'answered') {
    return { kind: ping.state };
  }
  const { found } = ping;
  if (!found) {
    return { kind: 'missing' };
  }
  const tooOld =
    found.version !== latest &&
    services.some((service) => !found.services.includes(service));
  return tooOld
    ? { kind: 'outdated', latest, version: found.version }
    : { kind: 'installed', version: found.version };
}
