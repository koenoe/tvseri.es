import ButtonLink from '@/components/ui/button/ButtonLink';
import { homeGlyph } from '@/components/ui/icon/glyphs';

/** The error pages' way out: a glass button to Home, “Home” unless a page words it otherwise */
export default function HomeButton({
  children = 'Home',
}: Readonly<{ children?: string }>) {
  return (
    <ButtonLink href="/" icon={homeGlyph} variant="glass">
      {children}
    </ButtonLink>
  );
}
