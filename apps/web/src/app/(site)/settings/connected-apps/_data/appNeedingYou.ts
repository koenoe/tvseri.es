import 'server-only';

import { loadConnectionStatuses } from '../../_data/connections';
import { getSettingsViewer } from '../../_data/session';
import type { AppBrand } from '../../_lib/services';
import { appNeedingYou } from '../_lib/appNeedingYou';

/**
 * The card to open, from the statuses the cards read anyway (one request
 * each, shared). Never rejects: a failed read opens nothing.
 */
export async function loadAppNeedingYou(): Promise<AppBrand | ''> {
  try {
    const { accessToken } = await getSettingsViewer();
    return appNeedingYou(await loadConnectionStatuses(accessToken));
  } catch {
    return '';
  }
}
