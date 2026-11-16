import type { FeatureKind, ToyKind } from '@tvseri.es/utils';

/**
 * The names of the day's moments, their labels (`MomentLabel`): the loaded
 * sections and their placeholders draw the same words (the kind is known
 * before the data is).
 */
export const FEATURE_TITLE: Readonly<Record<FeatureKind, string>> = {
  archive: 'From the archive',
  binge: 'Binge calculator',
  'did-you-know': 'Did you know',
  stills: 'One season in stills',
};

export const TOY_TITLE: Readonly<Record<ToyKind, string>> = {
  'connected-by': 'Connected by',
  /** no title above the card: its heading line names it; this is its accessible name */
  versus: 'Versus',
  'whats-on': 'What’s on',
  'where-set': 'Where are they set?',
};

/** Pick one for me's label: the section, its placeholder and its error card draw the same words */
export const PICK_TITLE = 'Can’t decide? Let us pick';
