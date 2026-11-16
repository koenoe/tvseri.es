import IndexPage, { indexMetadata } from '../_discover/lists/IndexPage';

export const metadata = indexMetadata('country');

/** `/country`: every country landing (`IndexPage`) */
export default function Page() {
  return <IndexPage kind="country" />;
}
