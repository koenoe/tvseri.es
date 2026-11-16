import { shelfRoute } from '../_components/shelfRoute';

const route = shelfRoute('watchlist');

export const generateMetadata = route.generateMetadata;

/** The Library's watchlist shelf */
export default route.Page;
