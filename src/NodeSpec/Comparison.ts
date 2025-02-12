import { computeNodeSpec } from '../ReactVP';

export const differenceHeatmapNodeSpec: computeNodeSpec = {
  name: 'Binary Image Difference',
  displayLabel: 'binary image difference',
  description: 'The difference between two binary images.',
  category: 'comparison',
  inputs: [
    {
      name: 'image1',
      type: 'binary image',
      displayLabel: 'underlay image',
      description: 'The underlay image.'
    },
    {
      name: 'image2',
      type: 'binary image',
      displayLabel: 'reference image',
      description: 'The reference image to compare.'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image diff',
      widget: {
        type: 'ImageViewer',
        heatmapOverlay: true,
        isBinary: true
      }
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import io';
      const import2 = 'from im2im import Image as IM';
      return `${import1}
${import2}
from skimage import img_as_float

in_im1 = ${inputs.image1}
${outputs.image} = IM(in_im1.raw_image, in_im1.metadata)`;
    }
  }
};
