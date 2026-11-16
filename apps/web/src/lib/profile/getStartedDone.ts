import type { GetStartedStatus } from '@tvseri.es/schemas';

/** Get started's steps: services, series you've seen, your history */
const GET_STARTED_STEPS = 3;

/**
 * Get started is over once the API hides it or all three steps are done:
 * Home and the profile then stop drawing it at once (the API's own `hidden`
 * only follows 3 days later)
 */
export const isGetStartedDone = (
  status: Pick<GetStartedStatus, 'doneCount' | 'hidden'>,
): boolean => status.hidden || status.doneCount >= GET_STARTED_STEPS;
