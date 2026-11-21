import type { ReactNode } from 'react';

import cn from '@/lib/cn';

/**
 * Chrome's own screens, drawn small, with the thing to press ringed in cyan.
 * Decoration (each step's line says what to do), in Chrome's dark-theme
 * colours rather than the site's.
 */

const RING = 'shadow-[0_0_0_2px_var(--color-cyan)]';
const CHROME_BUTTON =
  'inline-flex h-6.5 items-center whitespace-nowrap rounded-full bg-[#8ab4f8] px-3 text-[11px] font-semibold leading-6.5 text-[#202124]';
const CHROME_OUTLINE =
  'inline-flex h-5.5 items-center whitespace-nowrap rounded-full px-2.5 text-[10px] font-medium leading-5.5 text-[#8ab4f8] shadow-[inset_0_0_0_1px_#5f6368]';
const BAR_URL =
  'h-4.5 flex-1 overflow-hidden whitespace-nowrap rounded-full bg-[#1c1d20] px-2 font-mono text-[10px] font-medium leading-4.5 text-[#e8eaed]';
const CENTRED = 'absolute inset-0 flex items-center justify-center';
const CHROME_BUTTON_RINGED = cn(CHROME_BUTTON, RING);
const PUZZLE_RING = cn('flex rounded-6 p-0.5', RING);
const PIN_RING = cn('ml-auto flex rounded-6 p-0.5 text-cyan', RING);
const DOWNLOAD_BOX = cn(CENTRED, 'flex-col gap-2.5 text-white/80');
const UNZIP_BOX = cn(CENTRED, 'gap-3.5 text-white/80');
const FOLDER_RING = cn('flex rounded-10 p-1.5', RING);
const DEV_TOGGLE = cn(
  'absolute top-10 right-2.5 flex items-center gap-2 rounded-8 px-2 py-1.5 text-[#e8eaed] text-[11px]',
  RING,
);
const PACK_CHIP = cn(CHROME_OUTLINE, '@max-[13rem]:hidden');
const CHROME_OUTLINE_RINGED = cn(CHROME_OUTLINE, RING);

function Drawn({
  children,
  size,
  stroke = 1.5,
}: Readonly<{ children: ReactNode; size: number; stroke?: number }>) {
  return (
    <svg
      className="block shrink-0"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={stroke}
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

const FOLDER = (
  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
);
const ZIP = (
  <>
    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <path d="M14 3v6h6M10 11v2M10 15v2" />
  </>
);
const PUZZLE = (
  <>
    <rect height="7" rx="1.5" width="7" x="3" y="3" />
    <rect height="7" rx="1.5" width="7" x="14" y="3" />
    <rect height="7" rx="1.5" width="7" x="3" y="14" />
    <path d="M17.5 14v7M14 17.5h7" />
  </>
);

function Picture({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      aria-hidden="true"
      className="@container image-rim relative h-50 overflow-hidden rounded-12 bg-[#111516]"
    >
      {children}
    </div>
  );
}

function ChromeWindow({
  children,
  url,
  urlRinged = false,
  tool,
}: Readonly<{
  children?: ReactNode;
  url: string;
  urlRinged?: boolean;
  /** Beside the address: the extensions button */
  tool?: ReactNode;
}>) {
  const urlClass = cn(BAR_URL, urlRinged && RING);
  return (
    <div className="absolute inset-x-3 top-3 bottom-0 rounded-t-8 bg-[#202124] shadow-[0_0_0_1px_rgb(255_255_255/0.08)]">
      <div className="flex h-7 items-center gap-2 rounded-t-8 bg-[#2b2c2f] px-2 text-[#e8eaed]">
        <span className={urlClass}>{url}</span>
        {tool}
      </div>
      {children}
    </div>
  );
}

/** The extension's tile as Chrome lists it: the cyan dot on the ground */
function ExtensionTile() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-[#1c2223]">
      <span className="size-2 rounded-full bg-cyan" />
    </span>
  );
}

export function StorePicture() {
  return (
    <Picture>
      <ChromeWindow url="chromewebstore.google.com">
        <div className="flex items-center gap-2.5 px-3 py-4.5">
          <ExtensionTile />
          <span className="flex-1 font-semibold text-[#e8eaed] text-[12px]">
            tvseri.es
          </span>
          <span className={CHROME_BUTTON_RINGED}>Add to Chrome</span>
        </div>
      </ChromeWindow>
    </Picture>
  );
}

export function AddExtensionPicture() {
  return (
    <Picture>
      <div className="absolute inset-x-3.5 top-5.5 rounded-10 bg-[#2b2c2f] p-3.5 text-[#e8eaed] text-[12px] leading-4.5 shadow-[0_8px_20px_rgb(0_0_0/0.5)]">
        <b className="mb-5.5 block font-semibold text-[13px]">
          Add “tvseri.es”?
        </b>
        <div className="flex justify-end gap-1.5">
          <span className={CHROME_OUTLINE}>Cancel</span>
          <span className={CHROME_BUTTON_RINGED}>Add extension</span>
        </div>
      </div>
    </Picture>
  );
}

export function PinPicture() {
  const puzzle = (
    <span className={PUZZLE_RING}>
      <Drawn size={14} stroke={1.8}>
        {PUZZLE}
      </Drawn>
    </span>
  );
  return (
    <Picture>
      <ChromeWindow tool={puzzle} url="tvseri.es">
        <div className="absolute top-8.5 right-2 w-40 rounded-8 bg-[#2b2c2f] p-1.5 shadow-[0_8px_16px_rgb(0_0_0/0.5)]">
          <div className="flex items-center gap-2 rounded-6 bg-white/6 p-1.5 text-[#e8eaed] text-[11px]">
            <ExtensionTile />
            tvseri.es
            <span className={PIN_RING}>
              <Drawn size={14} stroke={2}>
                <path d="M12 17v5M9 10.8V4h6v6.8l3 3.2v1H6v-1z" />
              </Drawn>
            </span>
          </div>
        </div>
      </ChromeWindow>
    </Picture>
  );
}

export function ConnectPicture() {
  return (
    <Picture>
      <div className={CENTRED}>
        <div className="flex w-41 flex-col items-center gap-3 rounded-16 bg-white/4 px-4 py-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]">
          <span className="flex size-10 items-center justify-center rounded-[11px] bg-[#141414] text-white/60">
            <Drawn size={18} stroke={1.8}>
              <rect height="13" rx="3" width="19" x="2.5" y="8" />
              <path d="M7.5 3.5l4 4 5-5" />
            </Drawn>
          </span>
          <b className="whitespace-nowrap font-semibold text-[13px] text-white leading-4.5">
            Your service
          </b>
          <span className="mt-2.5 inline-flex h-7.5 items-center gap-1.5 rounded-full bg-white px-4 font-semibold text-[#171717] text-[12px] leading-7.5 shadow-[0_0_0_2px_rgb(0_255_255/0.55)]">
            <Drawn size={13} stroke={2}>
              <path d="M9 7V2M15 7V2M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v5" />
            </Drawn>
            Connect
          </span>
        </div>
      </div>
    </Picture>
  );
}

export function DownloadPicture({ fileName }: Readonly<{ fileName: string }>) {
  return (
    <Picture>
      <div className={DOWNLOAD_BOX}>
        <Drawn size={44}>{ZIP}</Drawn>
        <span className="text-caption text-white/60">{fileName}</span>
      </div>
    </Picture>
  );
}

export function UnzipPicture() {
  return (
    <Picture>
      <div className={UNZIP_BOX}>
        <Drawn size={40}>{ZIP}</Drawn>
        <Drawn size={18} stroke={2}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </Drawn>
        <span className={FOLDER_RING}>
          <Drawn size={44}>{FOLDER}</Drawn>
        </span>
      </div>
      <span className="absolute inset-x-0 bottom-2.5 text-center text-caption text-white/60">
        double-click
      </span>
    </Picture>
  );
}

export function ExtensionsPagePicture() {
  return (
    <Picture>
      <ChromeWindow url="chrome://extensions" urlRinged>
        <div className="px-3 py-3.5 text-[#9aa0a6] text-[11px]">
          Type it in the address bar
        </div>
      </ChromeWindow>
    </Picture>
  );
}

export function DeveloperModePicture() {
  return (
    <Picture>
      <ChromeWindow url="chrome://extensions">
        <span className={DEV_TOGGLE}>
          Developer mode
          <span className="relative inline-block h-3.5 w-6.5 rounded-full bg-[#8ab4f8]">
            <span className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-[#202124]" />
          </span>
        </span>
      </ChromeWindow>
    </Picture>
  );
}

export function LoadUnpackedPicture() {
  return (
    <Picture>
      <ChromeWindow url="chrome://extensions">
        <div className="absolute top-10 left-2.5 flex gap-1.5">
          <span className={CHROME_OUTLINE_RINGED}>Load unpacked</span>
          {/* a 320px phone keeps only the one to press */}
          <span className={PACK_CHIP}>Pack extension</span>
        </div>
        <div className="absolute inset-x-2.5 top-19 bottom-2.5 flex items-center justify-center gap-1.5 rounded-8 border-[1.5px] border-[#8ab4f8]/60 border-dashed text-[#8ab4f8] text-[11px]">
          <Drawn size={14} stroke={1.8}>
            {FOLDER}
          </Drawn>
          or drop the folder here
        </div>
      </ChromeWindow>
    </Picture>
  );
}
