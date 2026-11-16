import { Suspense } from 'react';
import { formatGrouped } from '@/lib/formatCount';
import LineSkeleton from '../../_components/LineSkeleton';
import { loadSettingsCounts } from '../../_data/counts';
import { getSettingsViewer } from '../../_data/session';
import { DataCard, DataRow } from './DataCard';
import DownloadButton from './DownloadButton';

/** "4,812 episodes · " (nothing when the count didn't load). */
async function Episodes() {
  const { id } = await getSettingsViewer();
  const { episodes } = await loadSettingsCounts(id);
  return episodes === null ? null : <>{formatGrouped(episodes)} episodes · </>;
}

/**
 * Export: the history as a CSV the importer reads back as is, and
 * everything as one JSON. The API only offers a direct download for the JSON
 * (no emailed link), so the row says so plainly.
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
        <Suspense fallback={<LineSkeleton className="w-[9.5em]" />}>
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
