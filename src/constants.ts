export const DEFAULT_BACKGROUND_COLOR = '#171717';
export const DEFAULT_BACKGROUND_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// TODO: eventually we'll just show the provider that users are subscribed to
// but in order to do this we need a profile page or some way to store this information
export const WATCH_PROVIDER_PRIORITY_ADJUSTMENTS: Record<string, number> = {
  'Sky Go': 1000, // Sky GO sucks, so pust it down the list
  'BBC iPlayer': -20, // BBC iPlayer is free, so push it up the list
  Netflix: -30, // Highest priority for Netflix
  'Now TV': -15, // Good priority but below iPlayer
};
