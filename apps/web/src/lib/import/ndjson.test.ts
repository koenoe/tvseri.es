import { describe, expect, it } from 'vitest';

import { readNdjson, toNdjsonLine } from './ndjson';

const streamOf = (chunks: ReadonlyArray<Uint8Array>) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });

const collect = async (stream: ReadableStream<Uint8Array>) => {
  const values: unknown[] = [];
  for await (const value of readNdjson(stream)) {
    values.push(value);
  }
  return values;
};

describe('readNdjson', () => {
  const encoder = new TextEncoder();

  it('round-trips events', async () => {
    const events = [{ matched: 2, status: 'checked' }, { status: 'error' }];
    const bytes = encoder.encode(events.map(toNdjsonLine).join(''));
    await expect(collect(streamOf([bytes]))).resolves.toEqual(events);
  });

  it('joins a line split across chunks', async () => {
    const bytes = encoder.encode(
      `${toNdjsonLine({ a: 1 })}${toNdjsonLine({ b: 2 })}`,
    );
    const chunks = [bytes.slice(0, 5), bytes.slice(5, 14), bytes.slice(14)];
    await expect(collect(streamOf(chunks))).resolves.toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it('joins a multi-byte character split across chunks', async () => {
    const bytes = encoder.encode(toNdjsonLine({ title: 'Pokémon ✨ 日本' }));
    // Cut inside every character in turn
    for (let cut = 1; cut < bytes.length; cut++) {
      await expect(
        collect(streamOf([bytes.slice(0, cut), bytes.slice(cut)])),
      ).resolves.toEqual([{ title: 'Pokémon ✨ 日本' }]);
    }
  });

  it('reads a last line without a trailing newline and skips blank lines', async () => {
    const bytes = encoder.encode('{"a":1}\n\n  \n{"b":2}');
    await expect(collect(streamOf([bytes]))).resolves.toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it('is empty for an empty stream', async () => {
    await expect(collect(streamOf([]))).resolves.toEqual([]);
  });

  it('cancels the stream when the consumer stops early', async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
      pull(controller) {
        controller.enqueue(encoder.encode(toNdjsonLine({ a: 1 })));
      },
    });
    for await (const _ of readNdjson(stream)) {
      break;
    }
    expect(cancelled).toBe(true);
  });
});
