import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// The deployed bundle imports `ui.css` as text and fonts as bytes
// (infra/auth.ts `nodejs.loader`); Vite would treat them as assets. Each is
// resolved to a virtual id so Vite's own plugins skip it.
const AS_TEXT = '\0as-text:';
const AS_BYTES = '\0as-bytes:';

export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      load(id) {
        if (id.startsWith(AS_TEXT)) {
          const text = readFileSync(id.slice(AS_TEXT.length), 'utf8');
          return `export default ${JSON.stringify(text)};`;
        }
        if (id.startsWith(AS_BYTES)) {
          const base64 = readFileSync(id.slice(AS_BYTES.length)).toString(
            'base64',
          );
          return `export default Uint8Array.from(atob(${JSON.stringify(base64)}), (c) => c.charCodeAt(0));`;
        }
        return null;
      },
      name: 'auth-loaders',
      async resolveId(source, importer) {
        const prefix = source.endsWith('.css')
          ? AS_TEXT
          : source.endsWith('.woff2')
            ? AS_BYTES
            : null;
        if (!prefix || !importer) return null;
        const resolved = await this.resolve(source, importer, {
          skipSelf: true,
        });
        return resolved ? `${prefix}${resolved.id}` : null;
      },
    },
  ],
  test: {
    // Linked SST resources for tests (sst reads SST_RESOURCES_JSON)
    env: {
      SST_RESOURCES_JSON: JSON.stringify({
        AuthEmail: { sender: 'example.com' },
        AuthUsers: { name: 'Users' },
      }),
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
