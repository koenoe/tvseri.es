import { buttonStyles } from '@/components/ui/button/buttonStyles';
import CopyButton from '@/components/ui/button/CopyButton';
import {
  chevronDownGlyph,
  downloadGlyph,
  folderGlyph,
  toggleGlyph,
} from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import { EXTENSION_VERSION, extensionZipName } from '@/lib/extension/release';

import { EXTENSION_ZIP_HREF } from '../_lib/zip';
import InstallStep, { STEP_GRID } from './InstallStep';
import {
  ConnectPicture,
  DeveloperModePicture,
  DownloadPicture,
  ExtensionsPagePicture,
  LoadUnpackedPicture,
  PinPicture,
  UnzipPicture,
} from './StepPictures';

const ZIP_NAME = extensionZipName(EXTENSION_VERSION);

const DOWNLOAD = buttonStyles({
  className: 'self-start',
  size: 'xs',
  variant: 'primary',
});

/** A 24px pill in the chip: its icon side 2px in, its target 40px tall */
const CHIP_COPY =
  '-mr-1.5 h-6 gap-1.5 px-2 has-[>svg:first-child]:pl-1.5 after:-inset-y-2';

const EXTENSIONS_URL = 'chrome://extensions';

/** The chip's corners: the pill's 12 plus the 4px round it */
const CHIP =
  'inline-flex min-h-8 max-w-full flex-wrap items-center gap-x-2 gap-y-1 self-start break-all rounded-16 py-1 bg-black/28 px-3 font-medium font-mono text-[13px] text-white leading-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]';

/**
 * The steps fade in and out with the toggle, as the chevron turns (Chrome
 * 131+; elsewhere they snap). Opacity only: on a phone the body is about
 * 2000px tall. The global reduced-motion rule doesn't reach this
 * pseudo-element, so it opts out itself.
 */
const DISCLOSURE =
  'group rounded-[20px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] [&::details-content]:opacity-0 [&::details-content]:transition-[opacity,content-visibility] [&::details-content]:duration-200 [&::details-content]:ease-out [&::details-content]:transition-discrete open:[&::details-content]:opacity-100 motion-reduce:[&::details-content]:transition-none';

/** The whole row toggles, so the whole row answers the pointer */
const SUMMARY =
  'flex cursor-pointer list-none items-center justify-between gap-4 rounded-[20px] px-6 py-4 transition-colors duration-150 ease-out hover:bg-white/4 active:bg-white/6 [&::-webkit-details-marker]:hidden';

const downloadAction = (
  <a className={DOWNLOAD} download={ZIP_NAME} href={EXTENSION_ZIP_HREF}>
    <Icon glyph={downloadGlyph} size={14} />
    Download the zip
  </a>
);

// Chrome blocks links to chrome://, so the address is copied instead
const copyAction = (
  <span className={CHIP}>
    {EXTENSIONS_URL}
    <CopyButton
      className={CHIP_COPY}
      copied={`Copied ${EXTENSIONS_URL}`}
      size="xs"
      text={EXTENSIONS_URL}
    >
      Copy
    </CopyButton>
  </span>
);

const downloadPicture = <DownloadPicture fileName={ZIP_NAME} />;

/** A native disclosure, so it works before (and without) any script */
export default function ManualInstall({ open }: Readonly<{ open: boolean }>) {
  return (
    <details className={DISCLOSURE} open={open}>
      <summary className={SUMMARY}>
        <span className="flex items-center gap-3.5">
          <Icon glyph={folderGlyph} size={20} />
          <b className="font-semibold text-body leading-6">
            Install it without the store
          </b>
        </span>
        <Icon
          className="text-white/60 transition-transform group-open:rotate-180"
          glyph={chevronDownGlyph}
          size={20}
        />
      </summary>
      <div className="flex flex-col gap-4 px-6 pb-6">
        <ol className={STEP_GRID}>
          <InstallStep
            action={downloadAction}
            number={1}
            picture={downloadPicture}
            title="Download"
          >
            Download the zip file.
          </InstallStep>
          <InstallStep number={2} picture={<UnzipPicture />} title="Unzip it">
            Double-click the zip. You get a folder.
          </InstallStep>
          <InstallStep
            action={copyAction}
            number={3}
            picture={<ExtensionsPagePicture />}
            title="Open Chrome’s extensions"
          >
            Copy this and paste it into Chrome’s address bar.
          </InstallStep>
          <InstallStep
            number={4}
            picture={<DeveloperModePicture />}
            title="Turn on Developer mode"
          >
            Flip the switch at the top right.
          </InstallStep>
          <InstallStep
            number={5}
            picture={<LoadUnpackedPicture />}
            title="Load unpacked"
          >
            Click Load unpacked and pick the folder. Or drag the folder onto the
            page.
          </InstallStep>
          <InstallStep number={6} picture={<PinPicture />} title="Pin it">
            Click the puzzle piece, then the pin next to tvseri.es.
          </InstallStep>
          <InstallStep
            number={7}
            picture={<ConnectPicture />}
            title="Press Connect"
          >
            Come back here and press Connect on the service you want.
          </InstallStep>
        </ol>
        <p className="flex items-center gap-2.5 rounded-12 bg-white/5 px-4 py-3 font-medium text-[15px] text-white leading-6">
          <Icon className="text-white/80" glyph={toggleGlyph} size={18} />
          Keep Developer mode on, or Chrome switches the extension off.
        </p>
      </div>
    </details>
  );
}
