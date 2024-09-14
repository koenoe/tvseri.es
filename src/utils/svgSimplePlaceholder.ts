const svgSimplePlaceholder = (
  width: number,
  height: number,
  mode: 'dark' | 'light' = 'dark',
) => {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" version="1.1">
      <rect width="100%" height="100%" fill="${mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}" />
    </svg>
  `;
  return btoa(svg);
};

export default svgSimplePlaceholder;
