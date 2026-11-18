import { createLoader } from '@/lib/lazy/createLoader';

/**
 * The overlay's code: on idle after the page loads, on a sign of intent, or
 * on the first open if that comes first. The launcher in the root layout
 * stays tiny.
 */
const overlay = createLoader(() => import('./SearchOverlay'));

const loadOverlay = overlay.load;

export default loadOverlay;
