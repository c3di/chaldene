/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { type computeNodeSpec } from '../ReactVP';

export const cropNodeSpec: computeNodeSpec = {
  name: 'crop',
  displayLabel: 'crop',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image to be cropped.'
    },
    {
      name: 'crop_area',
      widget: {
        type: 'BoundingBox'
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image'
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
${outputs.outputImage} = IM(${image}.raw_image[${cropArea.x}:${
        cropArea.x + cropArea.width
      }, ${cropArea.y}:${cropArea.y + cropArea.height}], ${image}.metadata)`;
    }
  }
};

export const dilationNodeSpec: computeNodeSpec = {
  name: 'dilation',
  displayLabel: 'dilation',
  description:
    'Return the dilated image applying the same kernel in each channel.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image for dilation.'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The dilated output image.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import morphology';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.dilation(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const erosionNodeSpec: computeNodeSpec = {
  name: 'erosion',
  displayLabel: 'erosion',
  description:
    'Return the eroded image applying the same kernel in each channel.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image for erosion.'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The eroded output image.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import morphology';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.erosion(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const openingNodeSpec: computeNodeSpec = {
  name: 'opening',
  displayLabel: 'opening',
  description:
    'Return the opened image (erosion followed by dilation), applying the same kernel in each channel.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description:
        'Input image tensor with shape (B, C, H, W) and intensity from [0, 1].'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The opened output image.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import morphology';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.outputImage} = IM(morphology.opening(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const denoiseBilateralNodeSpec: computeNodeSpec = {
  name: 'denoise_bilateral',
  displayLabel: 'denoise bilateral',
  description:
    'Applies bilateral denoising to reduce noise while preserving edges.',
  category: 'Image Processing',
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
      description: 'The denoised output image.'
    }
  ],

  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import restoration';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
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
  category: 'Image Processing',
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
      description: 'The local contrast image.'
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
  category: 'Image Processing',
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
      displayLabel: 'image'
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

export const invertNodeSpec: computeNodeSpec = {
  name: 'Invert',
  displayLabel: 'invert',
  description:
    'Invert the values of an input image tensor by its maximum value.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image to be inverted.'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The inverted output image.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import util';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(util.invert(in_im.raw_image), in_im.metadata)`;
    }
  }
};
