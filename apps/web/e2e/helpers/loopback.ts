import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void> | void;

// `localhost` resolves to both loopbacks and Node tries them in turn, giving
// every address but the last 250ms. A client thread busy for longer (a
// prerender in `next build`) times the first one out although it connected;
// with nothing on the other address the fetch failed, and the build baked
// the error into the page's shell. Never `::`: that is every interface.
const HOSTS = ['127.0.0.1', '::1'] as const;

// A machine without IPv6 still serves on 127.0.0.1, where nothing races
const NO_IPV6 = new Set(['EADDRNOTAVAIL', 'EAFNOSUPPORT']);

// A throw outside any request (a timer, a stream nobody awaited) is logged,
// not fatal: every test after it still needs the stub
let survivesStrayErrors = false;
function surviveStrayErrors() {
  if (survivesStrayErrors) {
    return;
  }
  survivesStrayErrors = true;
  process.on('uncaughtException', (error) => {
    console.error('[stub] uncaught exception:', error);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[stub] unhandled rejection:', reason);
  });
}

/**
 * Serves a stub on both loopback addresses. A handler that throws answers
 * 500 and is logged: one broken fixture must not end the server, and with
 * it every test after it; a stray throw outside a request is logged too.
 * Resolves to a function that stops both.
 */
export async function serveOnLoopback(
  port: number,
  handler: Handler,
): Promise<() => Promise<void>> {
  const guarded: Handler = async (request, response) => {
    try {
      await handler(request, response);
    } catch (error) {
      console.error(`[stub] ${request.method} ${request.url} failed:`, error);
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ message: 'Stub failed (see its log)' }));
    }
  };
  const servers = await Promise.all(
    HOSTS.map(
      (host) =>
        new Promise<Server | null>((resolve, reject) => {
          const server = createServer(guarded);
          // Longer than the web's keep-alive (undici: 4s, or the server's
          // hint), so the client always closes an idle socket first. With
          // Node's 5s default, a request sent on a socket the server was
          // about to drop was reset (ECONNRESET), above all while this one
          // thread was busy.
          server.keepAliveTimeout = 60_000;
          server.once('error', (error: NodeJS.ErrnoException) => {
            if (host === '::1' && error.code && NO_IPV6.has(error.code)) {
              resolve(null);
              return;
            }
            reject(error);
          });
          server.listen(port, host, () => resolve(server));
        }),
    ),
  );
  // After listening: a port already taken still ends the process
  surviveStrayErrors();
  const listening = servers.filter((server) => server !== null);
  return async () => {
    await Promise.all(
      listening.map(
        (server) =>
          new Promise<void>((resolve) => {
            server.closeAllConnections();
            server.close(() => resolve());
          }),
      ),
    );
  };
}
