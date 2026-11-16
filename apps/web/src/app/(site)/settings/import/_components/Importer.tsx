'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

import type { ImporterData } from '../_data/importer';
import { previewTitles } from '../_lib/previewTable';
import { useImporter } from '../_lib/useImporter';
import { usePreviewPosters } from '../_lib/usePreviewPosters';
import CheckStep from './CheckStep';
import LastImportUndo from './LastImportUndo';
import Stepper from './Stepper';
import UploadStep from './UploadStep';

/** Step 3 and its dialog load when the import starts, not with the page. */
// next/dynamic on purpose: this piece is also rendered on the server, which a client-only loader cannot do.
const ImportStep = dynamic(() => import('./ImportStep'));

const STEP = { check: 2, import: 3, upload: 1 } as const;

/**
 * The importer: Upload · Check · Import.
 * Everything runs in the browser against the import route; nothing is
 * written before step 3.
 */
export default function Importer({
  lastImport,
  posters,
  providers,
  username,
}: ImporterData) {
  const importer = useImporter(lastImport);
  const confirmLastUndo = () => void importer.confirmLastUndo();
  const { state } = importer;
  const titles = useMemo(
    () =>
      state.step === 'check'
        ? previewTitles(
            state.file.rows,
            state.mapping,
            state.prepared.dateOrder,
          )
        : [],
    [state],
  );
  const thumbs = usePreviewPosters(titles);

  return (
    <div className="flex flex-col gap-8 max-md:gap-5.5">
      <Stepper step={STEP[state.step]} />
      <div className="flex flex-col gap-6">
        {state.step === 'upload' ? (
          <UploadStep
            busy={importer.isReading}
            onFiles={importer.onFiles}
            onTab={importer.setTab}
            posters={posters}
            tab={state.tab}
          >
            <LastImportUndo
              onAsk={importer.askLastUndo}
              onConfirm={confirmLastUndo}
              state={importer.lastImport}
            />
          </UploadStep>
        ) : null}
        {state.step === 'check' ? (
          <CheckStep
            importer={importer}
            posters={thumbs}
            providers={providers}
            state={state}
          />
        ) : null}
        {state.step === 'import' ? (
          <ImportStep importer={importer} state={state} username={username} />
        ) : null}
      </div>
    </div>
  );
}
