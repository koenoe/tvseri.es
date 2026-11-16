declare module '*.css' {
  const content: string;
  export default content;
}

// infra/auth.ts bundles fonts with esbuild's `binary` loader
declare module '*.woff2' {
  const content: Uint8Array<ArrayBuffer>;
  export default content;
}
