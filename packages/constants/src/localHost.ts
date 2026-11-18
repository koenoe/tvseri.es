/** The hosts a local run serves from (`sst dev`, the e2e stubs, the load rig) */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1']);

export const isLocalHost = (hostname: string) => LOCAL_HOSTS.has(hostname);

/** Plain http on a local host: the one non-https origin a local run may use */
export const isLocalHttp = (
  url: Readonly<{ hostname: string; protocol: string }>,
) => url.protocol === 'http:' && isLocalHost(url.hostname);
