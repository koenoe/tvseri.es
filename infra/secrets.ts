/// <reference path="../.sst/platform/config.d.ts" />

export const googleClientId = new sst.Secret('GoogleClientId');
export const mdblistApiKey = new sst.Secret('MdblistApiKey');
export const omdbApiKey = new sst.Secret('OmdbApiKey');
export const sessionSecret = new sst.Secret('SessionSecret');
export const tmdbApiAccessToken = new sst.Secret('TmdbApiAccessToken');
export const tmdbApiKey = new sst.Secret('TmdbApiKey');

// Shared only between Vercel and the API's edge, so it never rotates on a
// timer: a rotation 401s every call until the new web build is live. Bump
// `version` to replace it by hand.
export const apiKeyRandom = new random.RandomPassword('ApiKeyRandom', {
  keepers: {
    version: '2',
  },
  length: 24,
  special: false,
});

export const apiKey = new sst.Linkable('ApiKey', {
  properties: { value: apiKeyRandom.result },
});
