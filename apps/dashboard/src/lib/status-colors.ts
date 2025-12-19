export const STATUS_COLORS = {
  amber: {
    bg: 'bg-amber-500',
    hsl: 'hsl(38, 92%, 50%)',
    text: 'text-amber-500',
  },
  green: {
    bg: 'bg-green-500',
    hsl: 'hsl(142, 71%, 45%)',
    text: 'text-green-500',
  },
  red: {
    bg: 'bg-red-500',
    hsl: 'hsl(0, 72%, 51%)',
    text: 'text-red-500',
  },
} as const;

export const countryDisplayNames = new Intl.DisplayNames(['en'], {
  type: 'region',
});
