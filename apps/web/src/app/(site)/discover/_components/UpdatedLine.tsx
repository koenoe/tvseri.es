import { getGoDeeper } from '@/app/(site)/_discover/data/goDeeper';
import { calendarGlyph } from '@/components/ui/icon/glyphs';
import MetaItem from '@/components/ui/meta/MetaItem';
import { isUnavailable } from '@/lib/cache/unavailable';
import { updatedLine } from '../_data/format';

/** "Updated Nov 10": the day today's rows were picked for */
export default async function UpdatedLine() {
  const goDeeper = await getGoDeeper();
  if (isUnavailable(goDeeper)) {
    return null;
  }
  return <MetaItem icon={calendarGlyph}>{updatedLine(goDeeper.date)}</MetaItem>;
}
