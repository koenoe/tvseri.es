import { describe, expect, it } from 'vitest';

import { extensionCta } from './extensionCta';

const SERVICES = ['netflix', 'bbc', 'prime'] as const;
const LATEST = '0.2.0';

const found = (version: string, services: ReadonlyArray<string>) =>
  ({
    found: { id: 'midg', services, version },
    state: 'answered',
  }) as const;

describe('extensionCta', () => {
  it('is checking until the browser answers', () => {
    expect(extensionCta({ state: 'checking' }, SERVICES, LATEST)).toEqual({
      kind: 'checking',
    });
  });

  it('can’t run where the server says the browser can’t', () => {
    expect(extensionCta({ state: 'unsupported' }, SERVICES, LATEST)).toEqual({
      kind: 'unsupported',
    });
  });

  it('is not installed when nothing answers the ping', () => {
    expect(
      extensionCta({ found: null, state: 'answered' }, SERVICES, LATEST),
    ).toEqual({ kind: 'missing' });
  });

  it('is installed, with its version, when it connects every service', () => {
    expect(extensionCta(found('0.1.0', SERVICES), SERVICES, LATEST)).toEqual({
      kind: 'installed',
      version: '0.1.0',
    });
  });

  it('nudges an update only when it is too old to connect a service', () => {
    expect(
      extensionCta(found('0.1.0', ['netflix', 'bbc']), SERVICES, LATEST),
    ).toEqual({ kind: 'outdated', latest: LATEST, version: '0.1.0' });
  });

  it('never nudges toward the version that is already installed', () => {
    expect(extensionCta(found(LATEST, ['netflix']), SERVICES, LATEST)).toEqual({
      kind: 'installed',
      version: LATEST,
    });
  });
});
