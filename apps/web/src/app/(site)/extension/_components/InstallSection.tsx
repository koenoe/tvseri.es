import { extensionInstall } from '@/lib/extension/extension';
import FinalSteps from './FinalSteps';
import InstallStep, { STEP_GRID } from './InstallStep';
import ManualInstall from './ManualInstall';
import { AddExtensionPicture, StorePicture } from './StepPictures';

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
      <FinalSteps first={3} />
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
