import { getColorScale, Colormap } from './genDiffMap';
import { rgb } from 'd3-color';
import { useRef, useEffect } from 'react';

export const drawColorBar = (
  ctx: CanvasRenderingContext2D,
  colormap: Colormap
) => {
  const colorScale = getColorScale(colormap);
  const width = colormap === 'binary' ? 60 : 120;

  // Clear canvas with white background for consistent blending
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, 20);

  if (colormap === 'binary') {
    // Draw two equal sections for binary colormap
    const sectionWidth = width / 2;

    const redColor = rgb(colorScale(-1));
    ctx.fillStyle = redColor?.toString() || '';
    ctx.fillRect(0, 0, sectionWidth, 20);

    const greenColor = rgb(colorScale(1));
    ctx.fillStyle = greenColor?.toString() || '';
    ctx.fillRect(sectionWidth, 0, sectionWidth, 20);
  } else {
    // Original continuous gradient for other colormaps
    for (let i = 0; i < width; i++) {
      const value = -1 + (i / (width - 1)) * 2;
      const color = rgb(colorScale(value));
      if (color) {
        color.opacity = 1;
        ctx.fillStyle = color.toString();
        ctx.fillRect(i, 0, 1, 20);
      }
    }
  }
};

export default function ColorBar({
  colormap
}: {
  colormap: Colormap;
}): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      drawColorBar(ctx, colormap);
    }
  }, [colormap]);

  const width = colormap === 'binary' ? 60 : 120;

  return (
    <div
      className="colorbar-container"
      style={{ width, backgroundColor: '#ffffff' }}
    >
      <canvas ref={canvasRef} width={width} height={20} />
      <div className="colorbar-labels">
        <span>-1</span>
        <span>1</span>
      </div>
    </div>
  );
}
