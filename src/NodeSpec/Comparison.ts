import { computeNodeSpec } from '../ReactVP';

export const differenceHeatmapNodeSpec: computeNodeSpec = {
  name: 'blend images',
  displayLabel: 'blend images',
  description: 'Blends two images together.',
  category: 'comparison',
  inputs: [
    {
      name: 'image1',
      type: 'image',
      displayLabel: 'underlay image',
      description: 'The first image to compare.'
    },
    {
      name: 'image2',
      type: 'image',
      displayLabel: 'overlay image',
      description: 'The second image to compare.'
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'Image comparison',
      widget: {
        type: 'ImageViewer',
        heatmapOverlay: true
      }
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `
import numpy as np
image1 = im2im(${inputs.image1}, 'numpy.gray_float64(0to1)').raw_image
image2 = im2im(${inputs.image2}, 'numpy.gray_float64(0to1)').raw_image
# absolute value of the difference and normalize to the range [0, 1] for visualization
# overlay
${outputs.heatmap} = IM((colored_diff * 255).astype(np.uint8), 'numpy.rgb_uint8')`;
    }
  }
};
