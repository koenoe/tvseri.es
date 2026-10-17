import { unauthorized } from 'next/navigation';

/**
 * The proxy rewrites protected pages to this route for logged-out visitors, so
 * they get the `unauthorized.tsx` login prompt (401) at the URL they asked
 * for. Static: the prompt doesn't depend on the request.
 */
export default function LoginPage() {
  unauthorized();
}
