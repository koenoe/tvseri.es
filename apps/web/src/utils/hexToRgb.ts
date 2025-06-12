import Color from 'color';

export default function hexToRgb(hex: string) {
  const color = Color(hex);
  return color.rgb().array();
}
