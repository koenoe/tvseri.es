import Link from 'next/link';

import InstallStep from './InstallStep';
import { ConnectPicture, PinPicture } from './StepPictures';

const LINK =
  'font-medium text-white underline decoration-white/30 underline-offset-3 transition-colors hover:decoration-white';

/** The last two steps, the same after a store or a manual install */
export default function FinalSteps({ first }: Readonly<{ first: number }>) {
  return (
    <>
      <InstallStep number={first} picture={<PinPicture />} title="Pin it">
        Click the puzzle piece, then the pin next to tvseri.es.
      </InstallStep>
      <InstallStep
        number={first + 1}
        picture={<ConnectPicture />}
        title="Connect a service"
      >
        Go to{' '}
        <Link className={LINK} href="/settings/connected-apps">
          Settings › Connected apps
        </Link>{' '}
        and press Connect on a service. Then confirm in the extension, top right
        of Chrome.
      </InstallStep>
    </>
  );
}
