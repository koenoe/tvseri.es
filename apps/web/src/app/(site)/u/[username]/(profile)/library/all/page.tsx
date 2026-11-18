import { shelfRoute } from '../_components/shelfRoute';

const route = shelfRoute('all');

export const generateMetadata = route.generateMetadata;

/** The Library's all shelf */
export default route.Page;
