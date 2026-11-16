import cn from '@/lib/cn';

import { Specimen, State } from './Specimen';

type Place = Readonly<{
  name: string;
  /** where the frame's toast sits (the Toaster's offsets, scaled) */
  toast: string;
  /** what the frame draws besides the toast */
  extra?: string;
  phone?: boolean;
}>;

/** `Toaster.tsx`'s places, drawn small: the one toast, where it goes */
const PLACES: ReadonlyArray<Place> = [
  {
    name: 'Desktop: viewport bottom right, 24px in, as wide as its content',
    toast: 'right-1 bottom-1 w-[22%]',
  },
  {
    name: 'Desktop: a long message, 560px at most, two lines',
    toast: 'right-1 bottom-1 h-6 w-[39%]',
  },
  {
    extra: 'inset-x-0 bottom-0 h-8 bg-black/20',
    name: 'Above the footer while it is in view',
    toast: 'right-1 bottom-9 w-[22%]',
  },
  {
    extra: 'inset-y-0 right-0 w-[42%] bg-white/8',
    name: 'Over a side sheet: the same place, inside the sheet',
    toast: 'right-1 bottom-1 w-[39%]',
  },
  {
    name: 'Phone: full width, 16px in, 40px up (two lines if needed)',
    phone: true,
    toast: 'inset-x-2 bottom-5 h-6',
  },
  {
    extra: 'inset-x-0 bottom-0 h-10 bg-white/8',
    name: 'Phone: above a sheet’s docked bar',
    phone: true,
    toast: 'inset-x-2 bottom-12',
  },
  {
    extra: 'inset-x-0 bottom-0 h-20 rounded-t-6 bg-white/80',
    name: 'Phone: above an open bottom sheet (the ⋯ sheet, a dialog)',
    phone: true,
    toast: 'inset-x-2 bottom-22',
  },
];

export default function ToastPositions() {
  return (
    <Specimen label="Positions" note="Toaster.tsx (static, scaled)">
      {PLACES.map((place) => (
        <State key={place.name} name={place.name}>
          <div
            className={cn(
              'relative overflow-hidden rounded-8 bg-page shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]',
              place.phone ? 'h-48 w-24' : 'h-32 w-56',
            )}
          >
            {place.extra ? (
              <span className={cn('absolute', place.extra)} />
            ) : null}
            <span
              className={cn(
                'absolute h-4 rounded-6 bg-[#141414] shadow-[0_0_0_1px_rgb(255_255_255/0.2)]',
                place.toast,
              )}
            />
          </div>
        </State>
      ))}
    </Specimen>
  );
}
