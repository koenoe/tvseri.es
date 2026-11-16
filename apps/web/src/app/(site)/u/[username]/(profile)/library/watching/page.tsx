import { shelfRoute } from '../_components/shelfRoute';

const route = shelfRoute('watching');

export const generateMetadata = route.generateMetadata;

/** The Library's watching shelf */
export default route.Page;
