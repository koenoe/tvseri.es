import { getViewer } from '@/auth/viewer';

import AdminImagesIsland, { type AdminImagesSeries } from './AdminImagesIsland';

/**
 * The admin image tray's hole: the viewer's role from the verified
 * token, the island only for admins, so nobody else loads its code. Render
 * it in a Suspense boundary INSIDE the show's `Page` (the tray drives the
 * page colour and backdrop through the background store).
 *
 * @example
 * <Suspense fallback={null}><AdminHole series={series} /></Suspense>
 */
export default async function AdminHole({
  series,
}: Readonly<{ series: AdminImagesSeries }>) {
  const viewer = await getViewer();
  if (viewer?.role !== 'admin') {
    return null;
  }
  const picked: AdminImagesSeries = {
    backdropColor: series.backdropColor,
    backdropImage: series.backdropImage,
    backdropPath: series.backdropPath,
    id: series.id,
    title: series.title,
    titleTreatmentImage: series.titleTreatmentImage,
  };
  return <AdminImagesIsland series={picked} />;
}
