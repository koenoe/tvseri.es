import ClampedText, { type ClampFit } from '@/components/ui/fold/ClampedText';

/** Below this many characters three lines of the sidebar always hold it */
const FIT: ClampFit = { base: 120 };

/** TMDB's biography, three lines with More / Less */
export default function Bio({ text }: Readonly<{ text: string }>) {
  return (
    <section aria-label="Biography">
      <ClampedText
        fit={FIT}
        text={text}
        textClassName="text-body text-white/80"
      />
    </section>
  );
}
