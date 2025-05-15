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
      type: 'number',
      displayLabel: 'sigma',
      description: 'Standard deviation for Gaussian kernel.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 1.5
      }
    },
    {
      name: 'mode',
      type: 'enum',
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
    },
    {
      name: 'kernel_size',
      type: 'number',
      displayLabel: 'kernel size',
      description:
        'Size of contextual regions (e.g., R x C pixels). If null or 0, defaults to 1/8th of image size.',
      defaultValue: 0,
      widget: {
        type: 'Number',
        min: 0,
        step: 16
      }
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
    Python: (inputs: Record<string, any>, outputs: Record<string, string>) => {
      const import1 = 'from skimage.exposure import equalize_adapthist';
      const import2 = 'from im2im import Image as IM';

      const image = inputs.image;
      const kernel_size = inputs.kernel_size;

      let kernel_size_py = 'None';
      if (
        kernel_size !== null &&
        typeof kernel_size === 'number' &&
        kernel_size > 0
      ) {
        kernel_size_py = String(Math.round(kernel_size));
      }

      return `${import1}
${import2}
in_im = im2im(${image}, 'numpy.float64(0to1)')
${outputs.outputImage} = IM(equalize_adapthist(in_im.raw_image, kernel_size=${kernel_size_py},  in_im.metadata)`;
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
    },
    {
      name: 'sigma',
      type: 'number',
      displayLabel: 'sigma',
      description: 'Standard deviation for Gaussian kernel.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 1
      }
    },
    {
      name: 'mode',
      type: 'enum',
      displayLabel: 'mode',
      description:
        'The mode parameter determines how the array borders are handled, where cval is the value when mode is equal to "constant". Default is "nearest".',
      defaultValue: 'constant',
      widget: {
        type: 'Dropdown',
        options: ['reflect', 'constant', 'nearest', 'mirror', 'wrap']
      }
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'binary image',
      displayLabel: 'binary image'
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
${outputs.outputImage} = IM(canny(in_im.raw_image, sigma=${inputs.sigma}, mode = '${inputs.mode}'), in_im.metadata)`;
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
        type: 'ImageGallery'
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

export const adjustGammaNodeSpec: computeNodeSpec = {
  name: 'adjust_gamma',
  displayLabel: 'adjust gamma',
  description: 'Performs Gamma Correction on the input image.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'gamma',
      type: 'number',
      displayLabel: 'gamma',
      description: 'Non negative real number. Default value is 1.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0.1,
        step: 0.3
      }
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'image',
      description: 'Gamma corrected output image.',
      showDiff: true
    }
  ],

  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage.exposure import adjust_gamma';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.float64(0to1)')
${outputs.outputImage} = IM(adjust_gamma(in_im.raw_image, gamma=${inputs.gamma}), in_im.metadata)`;
    }
  }
};

export const sobelNodeSpec: computeNodeSpec = {
  name: 'sobel_filter',
  displayLabel: 'sobel edge detection',
  description: 'Find edges in an image using the Sobel filter.',
  category: 'feature detection',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'mode',
      type: 'enum',
      displayLabel: 'mode',
      description:
        'The boundary mode for the convolution. Default is "reflect".',
      defaultValue: 'reflect',
      widget: {
        type: 'Dropdown',
        options: ['reflect', 'constant', 'nearest', 'mirror', 'wrap']
      }
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'edge image',
      description: 'The image with edges detected by the Sobel filter.',
      showDiff: true
    }
  ],

  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, string>) => {
      const imports = [
        'from skimage.filters import sobel',
        'from im2im import Image as IM',
        'import numpy as np'
      ];

      const image = inputs.image;
      const mode = inputs.mode;

      const sobelCall = `sobel_result = sobel(in_im.raw_image, mode='${mode}')`;

      return `${imports.join('\n')}
in_im = im2im(${image}, 'numpy.float64(0to1)')
${sobelCall}
${outputs.outputImage} = IM(sobel_result, in_im.metadata)`;
    }
  }
};

export const unsharpMaskNodeSpec: computeNodeSpec = {
  name: 'unsharp_mask',
  displayLabel: 'unsharp mask',
  description: 'Unsharp masking filter to sharpen an image.',
  category: 'sharpen',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'radius',
      type: 'number',
      displayLabel: 'radius',
      description: 'Radius for the Gaussian blur. 0 means no blurring.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.1
      }
    },
    {
      name: 'amount',
      type: 'number',
      displayLabel: 'amount',
      description:
        'Factor to amplify details. Can be 0 or negative. Typically a small positive number (e.g., 1.0).',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.1
      }
    },
    {
      name: 'preserve_range',
      type: 'boolean',
      displayLabel: 'preserve range',
      description:
        'Whether to keep the original range of values. If false, input is converted via img_as_float conventions.',
      defaultValue: false,
      widget: {
        type: 'Boolean'
      }
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'sharpened image',
      description: 'Image with unsharp mask applied.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, string>) => {
      const image = inputs.image;
      const radius = inputs.radius;
      const amount = inputs.amount;
      const preserve_range = inputs.preserve_range;

      const preserve_range_py = preserve_range ? 'True' : 'False';

      const pythonCode = `from skimage.filters import unsharp_mask
from im2im import Image as IM
import numpy as np

# ${image} is assumed to be an im2im.Image object already
output_raw = unsharp_mask(
    ${image}.raw_image,
    radius=${radius},
    amount=${amount},
    preserve_range=${preserve_range_py}
)

# Normalize/clip output to handle potential range issues for subsequent conversions
if output_raw.dtype == np.float64 or output_raw.dtype == np.float32:
    if ${image}.raw_image.dtype == np.uint8:
        # If original was uint8, clip to 0-1 (after skimage might have scaled it),
        # then scale to 0-255 and convert to uint8.
        # Unsharp mask with preserve_range=True should keep original scale, 
        # but if it was converted to float by skimage, it might be 0-1 or 0-255 float.
        # Let's assume if preserve_range=True and input was uint8, output_raw is float in [0,255] range.
        # If preserve_range=False, it might be in [0,1] or [-1,1]
        if preserve_range: # preserve_range=True, original uint8
            output_raw = np.clip(output_raw, 0, 255)
            output_raw = output_raw.astype(np.uint8)
        else: # preserve_range=False, implies img_as_float was used, output likely in [0,1] or [-1,1]
            min_val = -1.0 if output_raw.min() < 0 else 0.0
            output_raw = np.clip(output_raw, min_val, 1.0)
    else: # Original was float
        # Clip to a standard float range, e.g., [0,1] or original image's range if known and sensible
        # For simplicity, let's clip to [0,1] if min is non-negative, else [-1,1]
        min_val = -1.0 if output_raw.min() < 0 else 0.0
        output_raw = np.clip(output_raw, min_val, 1.0)

${outputs.outputImage} = IM(output_raw, ${image}.metadata)`;

      return pythonCode;
    }
  }
};

export const denoiseWaveletNodeSpec: computeNodeSpec = {
  name: 'denoise_wavelet',
  displayLabel: 'denoise wavelet',
  description:
    'Perform wavelet denoising on an image using methods like BayesShrink or VisuShrink.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image to be denoised.'
    },
    {
      name: 'wavelet',
      type: 'enum',
      displayLabel: 'wavelet type',
      description: 'Type of wavelet to use.',
      defaultValue: 'db1',
      widget: {
        type: 'Dropdown',
        options: [
          'db1',
          'db2',
          'db4',
          'haar',
          'sym2',
          'sym4',
          'coif1',
          'bior1.3',
          'rbio1.3'
        ]
      }
    },
    {
      name: 'method',
      type: 'enum',
      displayLabel: 'denoising method',
      description: 'Thresholding method to be used.',
      defaultValue: 'BayesShrink',
      widget: {
        type: 'Dropdown',
        options: ['BayesShrink', 'VisuShrink']
      }
    }
  ],
  outputs: [
    {
      name: 'outputImage',
      type: 'image',
      displayLabel: 'denoised image',
      description: 'The denoised output image.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, string>) => {
      const image = inputs.image;
      const wavelet = inputs.wavelet;
      const method = inputs.method;

      const pythonCode = `from skimage.restoration import denoise_wavelet
from im2im import Image as IM
import numpy as np

# ${image} is assumed to be an im2im.Image object already
output_raw = denoise_wavelet(
    ${image}.raw_image, 
    wavelet='${wavelet}',
    method='${method}'
)

# Ensure float output is clipped to [-1, 1] for compatibility with subsequent conversions
if output_raw.dtype.kind == 'f': # Check if float type (e.g., float32, float64)
    output_raw = np.clip(output_raw, -1.0, 1.0)

# If original was uint8 and current output (after clipping) is in [0,1] float range, convert back to uint8
if output_raw.dtype.kind == 'f' and \
   np.min(output_raw) >= 0.0 and np.max(output_raw) <= 1.0 and \
   ${image}.raw_image.dtype == np.uint8:
    output_raw = (output_raw * 255).astype(np.uint8)

${outputs.outputImage} = IM(output_raw, ${image}.metadata)`;

      return pythonCode;
    }
  }
};
