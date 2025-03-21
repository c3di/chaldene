/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { type computeNodeSpec } from '../ReactVP';

export const cropNodeSpec: computeNodeSpec = {
  name: 'crop',
  displayLabel: 'crop',
  category: 'image editing',
  sourceChanged: true,
  inputs: [
    {
      name: 'image',
      type: ['image', 'binary image'],
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'cropArea',
      type: 'tuple4',
      displayLabel: 'crop',
      description: 'Crop coordinates [x, y, width, height]',
      defaultValue: [0, 0, 0, 0],
      widget: {
        type: 'ImageCropper'
      }
    }
  ],

  outputs: [
    {
      name: 'outputImage',
      type: ['image', 'binary image'],
      displayLabel: 'image',
      description: 'The cropped output image.'
    }
  ],

  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      const import1 = 'from im2im import Image as IM';
      const import2 = 'import numpy as np';
      const image = inputs.image;
      const cropArea = inputs.cropArea;

      if (
        !cropArea ||
        !Array.isArray(cropArea) ||
        cropArea.every(v => v === 0)
      ) {
        return `${import1}
${import2}
${outputs.outputImage} = ${image}`;
      }

      const [x, y, width, height] = cropArea;

      return `${import1}
${import2}
${outputs.outputImage} = IM(${image}.raw_image[${y}:${y + height}, ${x}:${x + width}], ${image}.metadata)`;
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
      showDiff: true
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
export const GaussianBlurNodeSpec: computeNodeSpec = {
  name: 'Gaussian Blur',
  displayLabel: 'gaussian denoise',
  description: 'Apply Gaussian blur to remove noise.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'sigma',
      displayLabel: 'sigma',
      description: 'Standard deviation for Gaussian kernel.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.1
      }
    },
    {
      name: 'mode',
      displayLabel: 'mode',
      description:
        'The mode parameter determines how the array borders are handled, where cval is the value when mode is equal to "constant". Default is "nearest".',
      defaultValue: 'nearest',
      widget: {
        type: 'Dropdown',
        options: ['reflect', 'constant', 'nearest', 'mirror', 'wrap']
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The image after applying Gaussian blur.'
    }
  ],

  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.filters import gaussian
from im2im import Image as IM
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(gaussian(in_im.raw_image, sigma=${inputs.sigma}, mode = '${inputs.mode}', preserve_range=True), in_im.metadata)`;
    }
  }
};

export const CLAHENodeSpec: computeNodeSpec = {
  name: 'CLAHE',
  displayLabel: 'local contrast enhancement',
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
      showDiff: true
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
      type: 'binary image',
      displayLabel: 'binary image'
      // showDiff: true
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

export const batchProcessNodeSpec: computeNodeSpec = {
  name: 'batch_process',
  displayLabel: 'batch process',
  category: 'batch processing',
  description: 'Process multiple images from a folder.',
  inputs: [
    {
      name: 'folder_path',
      type: 'string',
      displayLabel: 'folder',
      description:
        "Select a folder containing images ('.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG').",
      widget: {
        type: 'FileInputFromServer',
        extensions: [] // Empty array indicates folder selection
      }
    },
    {
      name: 'image_gallery',
      type: 'string[]',
      displayLabel: 'gallery',
      description: 'Output selected images to process',
      defaultValue: [],
      widget: {
        type: 'ImageGallery' // No need for sourcePath here
      }
    }
  ],
  outputs: [
    {
      name: 'each selected image',
      type: 'image',
      displayLabel: 'processed image',
      description: 'The processed image.'
    },
    {
      name: 'batch_results',
      type: 'dataframe',
      displayLabel: 'batch results',
      description: 'The processed images.'
    }
  ],

  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => ''
  }
};

export const processResultNodeSpec: computeNodeSpec = {
  name: 'collect_batch_results',
  displayLabel: 'collect result per batch',
  description: 'Output the result at each batch.',
  category: 'batch processing',
  inputs: [
    {
      name: 'result',
      type: '*',
      displayLabel: 'result',
      description: 'result per batch.'
    }
  ],
  outputs: [],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `batch_outputs.append(${inputs.result})`;
    }
  }
};
