/** Newline-delimited JSON: one JSON value per line. */

export const toNdjsonLine = (value: unknown): string =>
  `${JSON.stringify(value)}\n`;

/**
 * Yields each JSON value from an NDJSON byte stream. Lines (and multi-byte
 * characters) may be split across chunks, so partial lines are buffered until
 * their newline arrives.
 */
export async function* readNdjson(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = done ? '' : (lines.pop() ?? '');

      for (const line of lines) {
        if (line.trim()) {
          yield JSON.parse(line) as unknown;
        }
      }

      if (done) {
        return;
      }
    }
  } finally {
    // No-op when fully read; frees the connection when the consumer stops early
    await reader.cancel().catch(() => {});
  }
}
