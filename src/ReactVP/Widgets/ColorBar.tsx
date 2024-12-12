import { getColorScale, Colormap } from './genDiffMap';
import { rgb } from 'd3-color';
import { useRef, useEffect } from 'react';

export const drawColorBar = (
  ctx: CanvasRenderingContext2D,
  colormap: Colormap
) => {
  const colorScale = getColorScale(colormap);
  const width = 120;
  for (let i = 0; i < width; i++) {
    const value = -1 + (i / (width - 1)) * 2;
    const color = rgb(colorScale(value));
    if (color) {
      color.opacity = 1;
      ctx.fillStyle = color.toString();
      ctx.fillRect(i, 0, 1, 20);
    }
  }

  // Text labels
  ctx.fillStyle = 'black';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('-1', 0, 35);
  ctx.fillText('1', width, 35);
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
  }, []);

  return <canvas ref={canvasRef} width={120} height={20}></canvas>;
}
