import * as fabric from 'fabric';
import * as d3Chromatic from 'd3-scale-chromatic';
import { scaleSequential } from 'd3-scale';
import { rgb } from 'd3-color';

export const COLORMAP_OPTIONS = [
  'viridis',
  'inferno',
  'plasma',
  'turbo',
  'rainbow',
  'binary'
] as const;

export type Colormap = (typeof COLORMAP_OPTIONS)[number];

const getBinaryColorScale = (value: number): any => {
  if (value === -1) {
    // Balanced red with full opacity
    return rgb(220, 60, 60).copy({ opacity: 1.0 }); // More balanced red, fully opaque
  }
  if (value === 1) {
    // Balanced green with full opacity
    return rgb(60, 180, 60).copy({ opacity: 1.0 }); // More balanced green, fully opaque
  }
  return rgb(255, 255, 255).copy({ opacity: 0 });
};

export const getColorScale = (colormap: Colormap) => {
  if (colormap === 'binary') {
    return getBinaryColorScale;
  }
  const interpolator = {
    viridis: d3Chromatic.interpolateViridis,
    inferno: d3Chromatic.interpolateInferno,
    plasma: d3Chromatic.interpolatePlasma,
    turbo: d3Chromatic.interpolateTurbo,
    rainbow: d3Chromatic.interpolateRainbow
  }[colormap];

  const scale = scaleSequential(interpolator).domain([-1, 1]);
  return (value: number) => rgb(scale(value)).copy({ opacity: 0.3 });
};
export const genDiffMap = (
  diff: number[][],
  colormap: Colormap
): fabric.FabricImage => {
  const width = diff[0].length;
  const height = diff.length;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) {
    return new fabric.FabricImage(tempCanvas);
  }

  const colorScale = getColorScale(colormap);
  const imageData = ctx.createImageData(width, height);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const value = diff[j][i];
      const { r, g, b, opacity } = rgb(colorScale(value));
      const idx = (j * width + i) * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = opacity * 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return new fabric.FabricImage(tempCanvas);
};
