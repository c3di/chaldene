import { computeNodeSpec } from '../ReactVP';

export const differenceHeatmapNodeSpec: computeNodeSpec = {
  name: 'difference heatmap',
  displayLabel: 'difference heatmap',
  description: 'Absolute value of the difference and normalize.',
  category: 'comparison',
  inputs: [
    {
      name: 'image1',
      type: 'image',
      displayLabel: 'image1',
      description: 'The first image to compare.'
    },
    {
      name: 'image2',
      type: 'image',
      displayLabel: 'image2',
      description: 'The second image to compare.'
    },
    {
      name: 'colormap',
      displayLabel: 'color map',
      description:
        'The color map used to visualize absolute value of difference.',
      defaultValue: 'viridis',
      widget: {
        type: 'Dropdown',
        options: ['viridis', 'gray', 'inferno', 'plasma', 'magma']
      }
    }
  ],
  outputs: [
    {
      name: 'heatmap',
      type: 'heatmap',
      displayLabel: 'heatmap',
      widget: {
        type: 'ImageViewer'
      }
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `
from matplotlib import colormaps
image1 = im2im(${inputs.image1}, 'numpy.gray_float64(0to1)').raw_image
image2 = im2im(${inputs.image2}, 'numpy.gray_float64(0to1)').raw_image
# absolute value of the difference and normalize to the range [0, 1] for visualization
normalized_diff = np.abs(image1 - image2)
normalized_diff /= np.max(normalized_diff)
colormap = colormaps['${inputs.colormap}']
colored_diff = colormap(normalized_diff)[:, :, :3]
${outputs.heatmap} = IM((colored_diff * 255).astype(np.uint8), 'numpy.rgb_uint8')`;
    }
  }
};
