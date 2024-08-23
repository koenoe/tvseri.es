import 'server-only';

function getExponentialBackoffWithJitter(
  baseDelay: number,
  attempt: number,
): number {
  const maxDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * maxDelay;
  return jitter;
}

export default async function patchedFetch(
  path: RequestInfo | URL,
  init?: RequestInit,
  retries: number = 2,
  baseDelay: number = 250,
) {
  const headers = {
    accept: 'application/json',
  };

  const next = init?.cache
    ? {}
    : {
        revalidate: 3600,
      };

  const patchedOptions = {
    ...init,
    next: {
      ...next,
      ...init?.next,
    },
    headers: {
      ...headers,
      ...init?.headers,
    },
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(path, patchedOptions);

    if (response.ok) {
      const json = await response.json();
      return json;
    }

    switch (response.status) {
      case 404:
        return undefined;

      case 503:
        if (attempt < retries) {
          const delay = getExponentialBackoffWithJitter(baseDelay, attempt);
          console.warn(
            `HTTP error status ${response.status}: attempt ${attempt + 1}, delay ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error(
            `HTTP error status: ${response.status} after ${retries + 1} attempts`,
          );
        }

      default:
        throw new Error(`HTTP error status: ${response.status}`);
    }
  }
}
