import IndexPage, { indexMetadata } from '../_discover/lists/IndexPage';

export const metadata = indexMetadata('network');

/** `/network`: every network landing (`IndexPage`) */
export default function Page() {
  return <IndexPage kind="network" />;
}
