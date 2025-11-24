import type { TvSeries } from '@tvseri.es/schemas';
import { cva, type VariantProps } from 'class-variance-authority';
import Image from 'next/image';

const imageStyles = cva('relative w-full', {
  defaultVariants: {
    size: 'medium',
  },
  variants: {
    size: {
      medium: ['h-24 md:h-40 md:w-[500px]'],
      small: ['h-24 md:h-36 md:w-[425px]'],
    },
  },
});

const textStyles = cva(
  'relative w-full text-center font-bold !leading-tight  md:text-left md:w-3/5',
  {
    defaultVariants: {
      size: 'medium',
    },
    variants: {
      size: {
        medium: ['text-3xl md:text-4xl lg:text-5xl xl:text-6xl'],
        small: ['text-xl md:text-2xl lg:text-3xl xl:text-4xl'],
      },
    },
  },
);

type TitleVariantProps = VariantProps<typeof imageStyles | typeof textStyles>;

export default function SpotlightTitle({
  className,
  item,
  size,
}: TitleVariantProps & Readonly<{ className?: string; item: TvSeries }>) {
  return (
    <>
      {item.titleTreatmentImage ? (
        <h1 className={imageStyles({ className, size })}>
          <Image
            alt={item.title}
            className="object-contain object-bottom md:object-left-bottom"
            draggable={false}
            fill
            priority
            src={item.titleTreatmentImage}
            unoptimized
          />
          <span className="hidden">{item.title}</span>
        </h1>
      ) : (
        <h1 className={textStyles({ className, size })}>{item.title}</h1>
      )}
    </>
  );
}
