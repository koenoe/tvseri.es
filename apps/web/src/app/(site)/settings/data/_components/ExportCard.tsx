import { formatGrouped } from '@tvseri.es/utils';
import { Suspense } from 'react';
import LineSkeleton from '../../_components/LineSkeleton';
import { loadSettingsCounts } from '../../_data/counts';
import { getSettingsViewer } from '../../_data/session';
import { DataCard, DataRow } from './DataCard';
import DownloadButton from './DownloadButton';

/**
 * The count and its skeleton are one unbreakable piece of the same text
 * (tabular figures, so any four-digit count is as wide as the sample): the
 * line wraps at the same word with either, at every width.
 */
const EPISODES = 'whitespace-nowrap tabular-nums';
const EPISODES_GHOST = `relative text-transparent ${EPISODES}`;

/** "4,812 episodes · " (nothing when the count didn't load). */
async function Episodes() {
  const { id } = await getSettingsViewer();
  const { episodes } = await loadSettingsCounts(id);
  return episodes === null ? null : (
    <>
      <span className={EPISODES}>
        {formatGrouped(episodes)} episodes ·
      </span>{' '}
    </>
  );
}

/** The count's text, invisible, with a bar over it */
function EpisodesSkeleton() {
  return (
    <>
      <span aria-hidden="true" className={EPISODES_GHOST}>
        0,000 episodes ·
        <LineSkeleton className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2" />
      </span>{' '}
    </>
  );
}

const episodesSkeleton = <EpisodesSkeleton />;

/**
 * Export: the history as a CSV the importer reads back as is, and
 * everything as one JSON.
 */
export default function ExportCard() {
  return (
    <DataCard dot="bg-white/75" title="Export">
      <DataRow
        action={
          <DownloadButton file="history" label="Download watch history" />
        }
        title="Watch history"
      >
        CSV ·{' '}
        <Suspense fallback={episodesSkeleton}>
          <Episodes />
        </Suspense>
        the same columns the importer reads, so it goes back in as is
      </DataRow>
      <hr className="h-px border-0 bg-white/7" />
      <DataRow
        action={
          <DownloadButton file="everything" label="Download everything" />
        }
        title="Everything"
      >
        JSON · profile, history, watchlist, favourites
      </DataRow>
    </DataCard>
  );
}
