import { shelfRoute } from '../_components/shelfRoute';

const route = shelfRoute('hidden');

export const generateMetadata = route.generateMetadata;

/** The Library's hidden shelf */
export default route.Page;
