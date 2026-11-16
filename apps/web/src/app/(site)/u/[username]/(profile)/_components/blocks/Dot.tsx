import { cva, type VariantProps } from 'class-variance-authority';

const dot = cva('size-2 shrink-0 rounded-full', {
  // Filled and hollow are separate classes per tone, so no two background
  // utilities ever compete
  compoundVariants: [
    { className: 'bg-cyan', hollow: false, tone: 'cyan' },
    { className: 'bg-pink', hollow: false, tone: 'pink' },
    { className: 'bg-white', hollow: false, tone: 'white' },
    {
      className: 'shadow-[inset_0_0_0_2px_#00ffff]',
      hollow: true,
      tone: 'cyan',
    },
    {
      className: 'shadow-[inset_0_0_0_2px_#ff0080]',
      hollow: true,
      tone: 'pink',
    },
    {
      className: 'shadow-[inset_0_0_0_2px_#ffffff]',
      hollow: true,
      tone: 'white',
    },
  ],
  defaultVariants: { glow: false, hollow: false, tone: 'white' },
  variants: {
    /** The cyan Out now dot: the only glow on the page */
    glow: { false: '', true: 'shadow-[0_0_10px_#00ffff]' },
    /** Empty block: the dot as a ring */
    hollow: { false: '', true: '' },
    /** cyan: watch now; pink: premieres and dates; white: a question about your record */
    tone: { cyan: '', pink: '', white: '' },
  },
});

export type DotTone = NonNullable<VariantProps<typeof dot>['tone']>;

/** The 8px block dot */
export default function Dot(props: Readonly<VariantProps<typeof dot>>) {
  const className = dot(props);
  return <span aria-hidden="true" className={className} />;
}
