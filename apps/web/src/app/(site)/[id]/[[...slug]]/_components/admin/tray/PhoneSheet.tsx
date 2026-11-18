'use client';

import { useId, useMemo } from 'react';

import SheetHandle from '@/components/ui/dialog/SheetHandle';
import { warningGlyph } from '@/components/ui/icon/glyphs';
import Icon from '@/components/ui/icon/Icon';
import cn from '@/lib/cn';

import { TOASTS } from '../copy';
import {
  backdropChoices,
  backdropCount,
  titleChoices,
  titleCount,
} from '../picker';
import { backdropUrl } from '../preview';
import BackdropStrip from './BackdropStrip';
import { CONFIRM, ResetButton, SaveButton, StatusChip } from './Controls';
import { LoadError, LoadingLine, Skeletons } from './Loading';
import { PageColourRow } from './PageColour';
import PhoneTabs, { panelId, tabId } from './PhoneTabs';
import { quietButton, smallAction, trayButton } from './styles';
import TitleStrip from './TitleStrip';
import type { TrayModel } from './useTray';

const EDGE = '-mx-gutter px-gutter';
const cancelClassName = quietButton({ size: 'phone' });
const keepClassName = trayButton({ size: 'lg' });
const yesClassName = trayButton({ size: 'lg', tone: 'solid' });

/** The sheet's confirm replaces its body. */
function PhoneConfirm({ model }: Readonly<{ model: TrayModel }>) {
  const kind = model.state.confirm ?? 'discard';
  const copy = CONFIRM[kind];
  const yes = kind === 'reset' ? model.reset : model.discard;
  return (
    <div
      aria-label={copy.question}
      className="flex flex-col gap-3 pt-1"
      role="alertdialog"
    >
      <b className="text-body font-semibold">{copy.question}</b>
      <p className="text-body-sm text-white/80">
        Visitors keep seeing what is saved now.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button className={keepClassName} onClick={model.keep} type="button">
          {copy.no}
        </button>
        <button className={yesClassName} onClick={yes} type="button">
          {copy.yes}
        </button>
      </div>
    </div>
  );
}

/** A failed save, inline (the toast stays hidden). */
function PhoneError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const className = cn(smallAction, 'bg-[#141210] text-white');
  return (
    <div
      className="flex min-h-11 items-center gap-2.5 rounded-12 bg-white py-1.5 pr-1.5 pl-3 text-meta font-medium text-[#141210]"
      role="alert"
    >
      <Icon glyph={warningGlyph} size={16} />
      <span className="min-w-0 flex-1">{TOASTS.error}</span>
      <button className={className} onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  );
}

function PhoneStrip({ model }: Readonly<{ model: TrayModel }>) {
  const { images, picked, served, state } = model;
  const onBackdrops = state.tab === 'backdrop';
  const choices = useMemo(() => {
    if (!images || !picked) {
      return null;
    }
    return onBackdrops
      ? { backdrops: backdropChoices(images, picked) }
      : { titles: titleChoices(images, served.title, picked) };
  }, [images, onBackdrops, picked, served.title]);
  if (model.load === 'error') {
    return <LoadError onRetry={model.retryLoad} />;
  }
  if (!images || !picked || !choices) {
    return (
      <>
        <LoadingLine label="Loading from TMDB…" />
        <Skeletons
          count={onBackdrops ? 4 : 3}
          kind={onBackdrops ? 'backdrop' : 'title'}
          phone
        />
      </>
    );
  }
  const titleBackdrop = backdropUrl(images, picked.backdrop, served);
  const count = onBackdrops
    ? backdropCount(images, picked.backdrop)
    : titleCount(images, picked.title);
  const titleOptions = choices.titles ?? [];
  return (
    <>
      <div className="flex min-h-6 items-center gap-2">
        <span className="text-caption text-white/60 tabular-nums">{count}</span>
      </div>
      {choices.backdrops ? (
        <BackdropStrip
          choices={choices.backdrops}
          className={EDGE}
          locked={model.locked}
          onPick={model.pickBackdrop}
          picked={picked.backdrop}
          size="phone"
        />
      ) : (
        <TitleStrip
          backdrop={titleBackdrop}
          choices={titleOptions}
          className={EDGE}
          locked={model.locked}
          onPick={model.pickTitle}
          picked={picked.title}
          seriesId={served.id}
          size="phone"
          title={served.title}
        />
      )}
    </>
  );
}

/** The phone bottom sheet's content (Backdrop and Title tabs). */
export default function PhoneSheet({ model }: Readonly<{ model: TrayModel }>) {
  const { state } = model;
  const ids = useId();
  const busy = state.busy !== null;
  const saveDisabled = !model.canSave;
  const tabLabelId = tabId(ids, state.tab);
  const tabPanelId = panelId(ids);
  return (
    <>
      <SheetHandle className="mx-auto" />
      <div className="flex h-10 items-center gap-2">
        <h2 className="text-body font-semibold text-white/80">Hero images</h2>
        <StatusChip status={model.status} />
        {state.confirm ? null : (
          <span className="ml-auto">
            <SaveButton
              busy={busy}
              disabled={saveDisabled}
              onSave={model.save}
              size="sm"
            />
          </span>
        )}
      </div>
      {state.confirm ? (
        <PhoneConfirm model={model} />
      ) : (
        <>
          {state.failed ? <PhoneError onRetry={model.retry} /> : null}
          <PhoneTabs ids={ids} model={model} />
          <div
            aria-labelledby={tabLabelId}
            className="flex flex-col gap-3"
            id={tabPanelId}
            role="tabpanel"
          >
            <PhoneStrip model={model} />
          </div>
          <PageColourRow colour={model.colour} />
          <div className="flex min-h-11 items-center justify-between">
            <button
              className={cancelClassName}
              onClick={model.cancel}
              type="button"
            >
              Cancel
            </button>
            {model.images?.preferred && !state.busy ? (
              <ResetButton onReset={model.askReset} phone />
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
