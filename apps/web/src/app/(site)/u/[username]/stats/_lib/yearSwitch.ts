/**
 * A Stats year switch (a year link in the sidebar, the pills or the sheet):
 * the only navigation on which the year at a glance cross-fades into the
 * next year's (`stats-glance`). Named per type, so a section streaming in
 * afterwards (an update outside any navigation) never fades the glance:
 * content replaces its placeholder at once.
 */
const YEAR_SWITCH = 'stats-year';

/** What the year links add to their navigation */
export const YEAR_SWITCH_TYPES = [YEAR_SWITCH];

/** The glance's view transition: on a year switch only */
export const GLANCE_ON_SWITCH = { default: 'none', [YEAR_SWITCH]: 'auto' };
