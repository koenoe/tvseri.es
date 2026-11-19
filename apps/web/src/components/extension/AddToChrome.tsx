import ButtonLink from '@/components/ui/button/ButtonLink';
import { plusGlyph } from '@/components/ui/icon/glyphs';
import { extensionInstall } from '@/lib/extension/extension';

const INSTALL = extensionInstall();

/** The store listing in a new tab, or /extension's manual install while there is none */
export default function AddToChrome({
  className,
}: Readonly<{ className?: string }>) {
  if (!INSTALL.external) {
    return (
      <ButtonLink
        className={className}
        href={INSTALL.href}
        icon={plusGlyph}
        variant="primary"
      >
        Add to Chrome
      </ButtonLink>
    );
  }
  return (
    <ButtonLink
      className={className}
      href={INSTALL.href}
      icon={plusGlyph}
      rel="noopener noreferrer"
      target="_blank"
      variant="primary"
    >
      Add to Chrome
      <span className="sr-only"> (opens in a new tab)</span>
    </ButtonLink>
  );
}
