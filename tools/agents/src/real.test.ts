import { describe, expect, it } from 'vitest';
import { webEnvFromResources } from './real.ts';

const resources = {
  SST_RESOURCE_ApiKey: JSON.stringify({ type: 'sst.sst.Linkable', value: 'k' }),
  SST_RESOURCE_ApiRouter: JSON.stringify({
    type: 'sst.aws.Router',
    url: 'https://api.example.com',
  }),
  SST_RESOURCE_Auth: JSON.stringify({
    type: 'sst.aws.Auth',
    url: 'https://auth.example.com',
  }),
  SST_RESOURCE_SessionSecret: JSON.stringify({
    type: 'sst.sst.Secret',
    value: 's',
  }),
};

describe('webEnvFromResources', () => {
  it('maps the linked resources to the web variables and drops the rest', () => {
    const env = webEnvFromResources({
      ...resources,
      AWS_REGION: 'eu-west-2',
      AWS_SECRET_ACCESS_KEY: 'x',
      PATH: '/bin',
      SST_RESOURCE_TmdbApiKey: '{"value":"t"}',
    });
    expect(env).toEqual({
      API_KEY: 'k',
      API_URL: 'https://api.example.com',
      AUTH_URL: 'https://auth.example.com',
      AWS_REGION: 'eu-west-2',
      PATH: '/bin',
      SECRET_KEY: 's',
    });
  });

  it('refuses a shell whose stage is production, whatever picked it', () => {
    expect(() =>
      webEnvFromResources({
        ...resources,
        SST_RESOURCE_App: JSON.stringify({
          name: 'tvseries',
          stage: 'production',
        }),
      }),
    ).toThrow(/never production/);
    expect(
      webEnvFromResources({
        ...resources,
        SST_RESOURCE_App: JSON.stringify({ name: 'tvseries', stage: 'koen' }),
      }).API_KEY,
    ).toBe('k');
  });

  it('names what is missing, never values', () => {
    expect(() =>
      webEnvFromResources({
        SST_RESOURCE_ApiKey: resources.SST_RESOURCE_ApiKey,
      }),
    ).toThrow(/API_URL \(SST_RESOURCE_ApiRouter\.url\).*AUTH_URL.*SECRET_KEY/);
  });
});
