import DropZoneFace, { DROP_ZONE_FRAME } from './DropZoneFace';
import HelpCard from './HelpCard';
import Stepper from './Stepper';

/**
 * The section's frame while the viewer's data streams in: step 1 exactly
 * as it will look, with a neutral wall, so nothing moves when it arrives.
 */
export default function ImportSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8 max-md:gap-5.5">
      <Stepper step={1} />
      <div className="flex flex-col gap-6">
        <div className={DROP_ZONE_FRAME}>
          <DropZoneFace posters={[]} />
        </div>
        <HelpCard tab="netflix" />
      </div>
    </div>
  );
}
