/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { type computeNodeSpec } from '../ReactVP';

export const cropNodeSpec: computeNodeSpec = {
  name: 'crop',
  displayLabel: 'Crop',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'crop',
      type: 'image',
      displayLabel: 'crop',
      widget: {
        type: 'ImageCropperWidget'
      }
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'image',
      description: 'The cropped output image.'
    }
  ],

  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      const import1 = 'from im2im import Image as IM';
      const import2 = 'import numpy as np';
      const image = inputs.image;
      const cropArea = inputs.crop_area;

      return `${import1}
${import2}
${outputs.outputImage} = IM(${image}.raw_image[${cropArea.y}:${
        cropArea.y + cropArea.height
      }, ${cropArea.x}:${cropArea.x + cropArea.width}], ${image}.metadata)`;
    }
  }
};

export const denoiseBilateralNodeSpec: computeNodeSpec = {
  name: 'denoise_bilateral',
  displayLabel: 'denoise bilateral',
  description:
    'Applies bilateral denoising to reduce noise while preserving edges.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'image',
      description: 'The denoised output image.',
      heatmapOverlay: true
    }
  ],

  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from im2im import Image as IM
from skimage import restoration
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.outputImage} = IM(restoration.denoise_bilateral(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const CLAHENodeSpec: computeNodeSpec = {
  name: 'CLAHE',
  displayLabel: 'CLAHE',
  description:
    'Contrast Limited Adaptive Histogram Equalization (CLAHE) for local contrast enhancement.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'image',
      description: 'The local contrast image.',
      heatmapOverlay: true
    }
  ],

  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage.exposure import equalize_adapthist';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.float64(0to1)')
${outputs.outputImage} = IM(equalize_adapthist(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const CannyNodeSpec: computeNodeSpec = {
  name: 'Canny Edge Detection',
  displayLabel: 'canny edge detection',
  description: 'Edge filter an image using the Canny algorithm.',
  category: 'feature detection',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'image',
      heatmapOverlay: true
    }
  ],

  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage.feature import canny';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.outputImage} = IM(canny(in_im.raw_image), in_im.metadata)`;
    }
  }
};
