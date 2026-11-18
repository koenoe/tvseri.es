'use client';

import { useDeferredValue, useMemo } from 'react';

import { pencilGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';

import {
  backdropChoices,
  backdropCount,
  titleChoices,
  titleCount,
} from '../picker';
import { backdropUrl } from '../preview';
import BackdropStrip from './BackdropStrip';
import { CONFIRM, ResetButton, SaveButton, StatusChip } from './Controls';
import Hint from './Hint';
import { LoadError, LoadingLine, Skeletons } from './Loading';
import { PageColourPanel } from './PageColour';
import { trayButton } from './styles';
import TitleStrip from './TitleStrip';
import type { TrayModel } from './useTray';

const tonal = trayButton();
const solid = trayButton({ tone: 'solid' });

/** Title, status, the hint and the actions (or a confirm). */
function DesktopHeader({ model }: Readonly<{ model: TrayModel }>) {
  const { state } = model;
  const confirm = state.confirm ? CONFIRM[state.confirm] : null;
  const confirmYes = state.confirm === 'reset' ? model.reset : model.discard;
  const busy = state.busy !== null;
  const saveDisabled = !model.canSave;
  return (
    <div className="flex h-10 items-center gap-4">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="text-white/60" glyph={pencilGlyph} size={20} />
        <h2 className="text-title-3">Hero images</h2>
        <StatusChip status={model.status} />
      </span>
      <Hint />
      {confirm ? (
        <div
          aria-label={confirm.question}
          className="flex items-center gap-2"
          role="alertdialog"
        >
          <span className="mr-2 text-body-sm font-medium">
            {confirm.question}
          </span>
          <button className={tonal} onClick={model.keep} type="button">
            {confirm.no}
          </button>
          <button className={solid} onClick={confirmYes} type="button">
            {confirm.yes}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {model.images?.preferred && !state.busy ? (
            <ResetButton onReset={model.askReset} />
          ) : null}
          <button className={tonal} onClick={model.cancel} type="button">
            Cancel
          </button>
          <SaveButton busy={busy} disabled={saveDisabled} onSave={model.save} />
        </div>
      )}
    </div>
  );
}

function Label({ count, name }: Readonly<{ count: string; name: string }>) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-0.5">
      <b className="text-body-sm font-semibold">{name}</b>
      <span className="text-caption text-white/60 tabular-nums">{count}</span>
    </div>
  );
}

/** Labels, the two strips and the page colour. */
function DesktopGrid({ model }: Readonly<{ model: TrayModel }>) {
  const { images, picked, served } = model;
  const bds = useMemo(
    () => (images && picked ? backdropChoices(images, picked) : []),
    [images, picked],
  );
  const titles = useMemo(
    () => (images && picked ? titleChoices(images, served.title, picked) : []),
    [images, picked, served.title],
  );
  const ready = images !== null && picked !== null;
  const bdCount = ready ? backdropCount(images, picked.backdrop) : '';
  const lgCount = ready ? titleCount(images, picked.title) : '';
  // The title tiles redraw on the new backdrop a frame later: stepping
  // through backdrops stays one cheap frame per key press.
  const backdrop = useDeferredValue(
    ready ? backdropUrl(images, picked.backdrop, served) : undefined,
  );
  return (
    <div className="grid grid-cols-[152px_minmax(0,1fr)_280px] grid-rows-[72px_72px] gap-x-4 gap-y-3">
      <Label count={bdCount} name="Backdrop" />
      {ready ? (
        <BackdropStrip
          choices={bds}
          locked={model.locked}
          onPick={model.pickBackdrop}
          picked={picked.backdrop}
          size="desktop"
        />
      ) : (
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {model.load === 'error' ? (
            <LoadError onRetry={model.retryLoad} />
          ) : (
            <>
              <LoadingLine label="Loading backdrops and logos from TMDB…" />
              <Skeletons count={6} kind="backdrop" />
            </>
          )}
        </div>
      )}
      <div className="col-start-3 row-span-2 row-start-1 flex min-w-0 flex-col gap-3 overflow-hidden border-white/8 border-l pl-4">
        <PageColourPanel colour={model.colour} />
      </div>
      <Label count={lgCount} name="Title" />
      {ready ? (
        <TitleStrip
          backdrop={backdrop}
          choices={titles}
          locked={model.locked}
          onPick={model.pickTitle}
          picked={picked.title}
          seriesId={served.id}
          size="desktop"
          title={served.title}
        />
      ) : model.load === 'error' ? (
        <span />
      ) : (
        <Skeletons count={6} kind="title" />
      )}
    </div>
  );
}

/** The desktop tray's content: header and grid. */
export default function DesktopTray({ model }: Readonly<{ model: TrayModel }>) {
  return (
    <>
      <DesktopHeader model={model} />
      <DesktopGrid model={model} />
    </>
  );
}
