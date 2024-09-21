import { computeNodeSpec } from '../ReactVP';

export const thresholdNodeSpec: computeNodeSpec = {
  name: 'threshold',
  displayLabel: 'threshold',
  category: 'binary image processing',
  description:
    'Generates a binary image by applying thresholding to the input image using specified upper and lower bounds. Pixels with values within the range are set to 1, while those outside the range are set to 0.',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image for thresholding.'
    },
    {
      name: 'upper',
      displayLabel: 'upper',
      description: 'The lower bound for the threshold.',
      defaultValue: 0.8,
      widget: {
        type: 'Number',
        min: 0,
        max: 1,
        step: 0.01
      }
    },
    {
      name: 'lower',
      displayLabel: 'lower',
      description: 'The upper bound for the threshold.',
      defaultValue: 0.2,
      widget: {
        type: 'Number',
        min: 0,
        max: 1,
        step: 0.01
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'binary image',
      description: 'The resulting binary image after thresholding.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `import numpy as np
from im2im import Image as IM
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
binarized_image = np.where((in_im.raw_image >= ${inputs.lower}) & (in_im.raw_image <= ${inputs.upper}), 1.0, 0.0)
${outputs.image} = IM(binarized_image, in_im.metadata)`;
    }
  }
};
