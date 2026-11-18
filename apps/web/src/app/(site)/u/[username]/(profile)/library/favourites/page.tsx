import { shelfRoute } from '../_components/shelfRoute';

const route = shelfRoute('favourites');

export const generateMetadata = route.generateMetadata;

/** The Library's favourites shelf */
export default route.Page;
