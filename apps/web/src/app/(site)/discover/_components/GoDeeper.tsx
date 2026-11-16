import { getGoDeeper } from '@/app/(site)/_discover/data/goDeeper';
import Row from '@/components/ui/row/Row';
import RowError from '@/components/ui/row/RowError';
import { isUnavailable } from '@/lib/cache/unavailable';
import GoDeeperCard from './GoDeeperCard';

export const GO_DEEPER_ID = 'go-deeper';

/**
 * Rabbit holes from this week's trending shows. The API leaves out a
 * card whose shows repeat the Essentials row above. Desktop pages them with
 * the arrows; phones swipe one card at a time.
 */
export default async function GoDeeper() {
  const goDeeper = await getGoDeeper();
  if (isUnavailable(goDeeper)) {
    return (
      <RowError
        id={GO_DEEPER_ID}
        look="hub"
        state="unavailable"
        tiles="card"
        title="Go deeper"
      />
    );
  }
  const { cards } = goDeeper;
  if (!cards.length) {
    return null;
  }
  return (
    <Row
      id={GO_DEEPER_ID}
      look="hub"
      name={GO_DEEPER_ID}
      tiles="card"
      title="Go deeper"
    >
      {cards.map((card) => (
        <GoDeeperCard card={card} key={`${card.kind}-${card.to.id}`} />
      ))}
    </Row>
  );
}
