import IndexPage, { indexMetadata } from '../_discover/lists/IndexPage';

export const metadata = indexMetadata('language');

/** `/language`: every language landing (`IndexPage`) */
export default function Page() {
  return <IndexPage kind="language" />;
}
