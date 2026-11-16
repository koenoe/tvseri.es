import Header from '@/components/header/Header';
import ForbiddenView from '@/components/ui/error/ForbiddenView';

/** 403 for `forbidden()`: admin-only pages. */
export default function Forbidden() {
  return <ForbiddenView header={<Header />} />;
}
