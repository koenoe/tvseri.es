import { createClient } from '@openauthjs/openauth/client';
import { Resource } from 'sst';

export const client = createClient({
  clientID: 'website',
  issuer: Resource.Auth.url,
});
