import { loadSettingsCounts } from '../../_data/counts';
import { getSettingsSession, getSettingsViewer } from '../../_data/session';
import DeleteAccount from './DeleteAccount';

/** The Delete account card's hole: the username to type and the history it names. */
export default async function DeleteAccountHole() {
  const [{ user }, { episodes }] = await Promise.all([
    getSettingsSession(),
    getSettingsViewer().then(({ id }) => loadSettingsCounts(id)),
  ]);
  return <DeleteAccount episodes={episodes} username={user.username} />;
}
