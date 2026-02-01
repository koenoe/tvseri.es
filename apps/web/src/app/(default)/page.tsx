// Re-export the home page component to handle RSC requests to `/`
// The rewrite in next.config.ts sends `/` to `/home` for HTML requests,
// but RSC prefetch requests to `/?_rsc=...` need an actual page here.
export { default } from './home/page';
