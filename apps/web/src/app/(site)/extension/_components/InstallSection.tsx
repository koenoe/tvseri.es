import { extensionInstall } from '@/lib/extension/extension';

import InstallStep, { STEP_GRID } from './InstallStep';
import ManualInstall from './ManualInstall';
import {
  AddExtensionPicture,
  ConnectPicture,
  PinPicture,
  StorePicture,
} from './StepPictures';

function StoreSteps() {
  return (
    <ol className={STEP_GRID}>
      <InstallStep number={1} picture={<StorePicture />} title="Add to Chrome">
        Press the button. The Chrome Web Store opens.
      </InstallStep>
      <InstallStep
        number={2}
        picture={<AddExtensionPicture />}
        title="Click “Add extension”"
      >
        Chrome asks if you’re sure. Click Add extension.
      </InstallStep>
      <InstallStep number={3} picture={<PinPicture />} title="Pin it">
        Click the puzzle piece, then the pin next to tvseri.es.
      </InstallStep>
      <InstallStep
        number={4}
        picture={<ConnectPicture />}
        title="Press Connect"
      >
        Come back here and press Connect on the service you want.
      </InstallStep>
    </ol>
  );
}

/** Without a store listing there are no store steps: the manual install opens instead */
export default function InstallSection() {
  const listed = extensionInstall().external;
  return (
    <section aria-labelledby="install" className="mt-16 flex flex-col gap-5">
      <h2 className="scroll-mt-24 text-title-2" id="install">
        Install it
      </h2>
      {listed ? <StoreSteps /> : null}
      <ManualInstall open={!listed} />
    </section>
  );
}
