import { createClient } from '@openauthjs/openauth/client';

export const client = createClient({
  clientID: 'website',
  issuer: process.env.AUTH_URL!,
});
