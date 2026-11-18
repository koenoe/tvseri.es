'use client';

import { catchError, type ErrorInfo } from 'next/error';
import type { ReactNode } from 'react';

import { FailedBlock } from '../blocks/BlockError';

/** Which variant shows: the full one but on a phone's sub-pages, the compact one only there */
const FULL_SHOWN = 'max-lg:profile-subpage:hidden';
const COMPACT_SHOWN = 'hidden max-lg:profile-subpage:block';

type Props = Readonly<{
  /** The two variants' placeholders (`IdentitySkeleton`'s parts), from the server */
  compact: ReactNode;
  full: ReactNode;
}>;

function IdentityUnavailable({ compact, full }: Props, { retry }: ErrorInfo) {
  return (
    <div data-unavailable="profile-identity">
      <FailedBlock
        className={FULL_SHOWN}
        fallback={full}
        retry={retry}
        title="Profile"
      />
      <FailedBlock
        className={COMPACT_SHOWN}
        fallback={compact}
        look="line"
        retry={retry}
        title="Profile"
      />
    </div>
  );
}

/**
 * The identity's failure (the profile read threw, a timeout or a 5xx): the
 * failed card lies over the identity's own placeholder, in the variant that
 * shows, so the sidebar keeps its size and the rest of the page renders
 * instead of one slow read taking the whole page to "Something broke". A
 * 404 or 401 passes through (`catchError` leaves Next's own errors alone).
 */
const IdentityError = catchError(IdentityUnavailable);

export default IdentityError;
