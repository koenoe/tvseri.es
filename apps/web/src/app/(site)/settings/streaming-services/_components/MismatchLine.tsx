import { globeGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import Flag from './Flag';

type Place = Readonly<{ code: string; name: string }>;

function Named({ code, name }: Place) {
  return (
    <span className="inline-flex items-center gap-1.5 text-white">
      <Flag className="h-[11px] w-4 rounded-[2px] bg-transparent" code={code} />
      {name}
    </span>
  );
}

/**
 * "Detected: Netherlands · You chose: United Kingdom · Use Netherlands": the
 * saved country differs from where the visitor is.
 */
export default function MismatchLine({
  chosen,
  detected,
  onUseDetected,
}: Readonly<{
  chosen: Place;
  detected: Place;
  onUseDetected: () => void;
}>) {
  return (
    <div className="-mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-18 bg-white/2.5 px-6 py-3 text-meta text-white/60">
      <Icon className="size-3.5" glyph={globeGlyph} size={16} />
      <span className="inline-flex flex-wrap items-center gap-1.5">
        Detected: <Named {...detected} />
        <i className="mx-1 not-italic">·</i>
        You chose: <Named {...chosen} />
      </span>
      <button
        className="cursor-pointer text-body-sm font-medium text-cyan hover:underline md:ml-auto"
        onClick={onUseDetected}
        type="button"
      >
        {`Use ${detected.name}`}
      </button>
    </div>
  );
}
