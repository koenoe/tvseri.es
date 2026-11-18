import { loadImporter } from '../_data/importer';
import Importer from './Importer';

/** The section's hole: the viewer's few fields, then the client importer. */
export default async function ImportSection() {
  const data = await loadImporter();
  return (
    <Importer
      lastImport={data.lastImport}
      posters={data.posters}
      providers={data.providers}
      username={data.username}
    />
  );
}
