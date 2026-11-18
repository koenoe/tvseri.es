import { shelfRoute } from '../_components/shelfRoute';

const route = shelfRoute('finished');

export const generateMetadata = route.generateMetadata;

/** The Library's finished shelf */
export default route.Page;
