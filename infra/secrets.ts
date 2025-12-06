export const googleClientId = new sst.Secret('GoogleClientId');
export const mdblistApiKey = new sst.Secret('MdblistApiKey');
export const sessionSecret = new sst.Secret('SessionSecret');
export const tmdbApiAccessToken = new sst.Secret('TmdbApiAccessToken');
export const tmdbApiKey = new sst.Secret('TmdbApiKey');

const apiKeyRotation = new time.Rotating('ApiKeyRotation', {
  rotationMonths: 1,
});

export const apiKeyRandom = new random.RandomPassword('ApiKeyRandom', {
  keepers: {
    rotation: apiKeyRotation.id,
  },
  length: 32,
  special: true,
});

export const apiKey = new sst.Linkable('ApiKey', {
  properties: { value: apiKeyRandom.result },
});
