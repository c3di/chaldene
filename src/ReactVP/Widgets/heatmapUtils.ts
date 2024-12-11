import * as fabric from 'fabric';
import * as d3Chromatic from 'd3-scale-chromatic';
import { scaleSequential } from 'd3-scale';
import { rgb } from 'd3-color';

export const COLORMAP_OPTIONS = [
  'viridis',
  'inferno',
  'plasma',
  'turbo',
  'rainbow'
] as const;

export type Colormap = (typeof COLORMAP_OPTIONS)[number];

const getBinaryColorScale = () => {
  return (value: number) => {
    if (value === -1) {
      return 'rgba(0, 0, 255, 0.8)';
    }
    if (value === 1) {
      return 'rgba(255, 0, 0, 0.8)';
    }
    return 'rgba(255, 255, 255, 0.1)';
  };
};

const getColorScale = (colormap: Colormap, minVal: number, maxVal: number) => {
  const interpolator = {
    viridis: d3Chromatic.interpolateViridis,
    inferno: d3Chromatic.interpolateInferno,
    plasma: d3Chromatic.interpolatePlasma,
    turbo: d3Chromatic.interpolateTurbo,
    rainbow: d3Chromatic.interpolateRainbow
  }[colormap];

  return scaleSequential(interpolator).domain([minVal, maxVal]);
};

export const generateHeatmap = (
  differences: number[][],
  width: number,
  height: number,
  colormap: Colormap,
  isBinary: boolean
): fabric.Image => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imageData = ctx.createImageData(width, height);
    type ColorMapperFunction = (value: number) => string;
    let colorMapper: ColorMapperFunction;

    if (isBinary) {
      colorMapper = getBinaryColorScale();
    } else {
      let minVal = differences[0][0];
      let maxVal = differences[0][0];
      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const value = differences[j][i];
          if (value < minVal) {
            minVal = value;
          }
          if (value > maxVal) {
            maxVal = value;
          }
        }
      }

      // Adjust domain based on min/max values
      let domainMin = -1;
      let domainMax = 1;

      if (minVal >= 0) {
        domainMin = 0; // If all values are positive, start scale at 0
      }
      if (maxVal <= 0) {
        domainMax = 0; // If all values are negative, end scale at 0
      }

      const colorScale = getColorScale(colormap, domainMin, domainMax);
      colorMapper = colorScale;
    }

    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const value = differences[j][i];
        const colorString = colorMapper(value);
        const color = rgb(colorString);

        if (color) {
          const idx = (j * width + i) * 4;
          imageData.data[idx] = color.r;
          imageData.data[idx + 1] = color.g;
          imageData.data[idx + 2] = color.b;

          if (isBinary) {
            imageData.data[idx + 3] = Math.abs(value) < 0.5 ? 0 : 204;
          } else {
            imageData.data[idx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return new fabric.Image(canvas);
};

export const drawColorBar = (
  ctx: CanvasRenderingContext2D,
  isBinary: boolean,
  colormap: Colormap
) => {
  if (isBinary) {
    const colorMapper = getBinaryColorScale();
    const segmentWidth = 20;
    const height = 20;

    ctx.fillStyle = colorMapper(1);
    ctx.fillRect(0, 0, segmentWidth, height);

    ctx.fillStyle = colorMapper(0);
    ctx.fillRect(segmentWidth, 0, segmentWidth, height);

    ctx.fillStyle = colorMapper(-1);
    ctx.fillRect(segmentWidth * 2, 0, segmentWidth, height);
  } else {
    const colorScale = getColorScale(colormap, -1, 1);
    const width = 120;

    for (let i = 0; i < width; i++) {
      const value = -1 + (i / (width - 1)) * 2;
      const colorString = colorScale(value);
      const color = rgb(colorString);
      if (color) {
        ctx.fillStyle = color.toString();
        ctx.fillRect(i, 0, 1, 20);
      }
    }
  }
};
