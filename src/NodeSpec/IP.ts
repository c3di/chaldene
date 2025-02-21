/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { type computeNodeSpec } from '../ReactVP';

export const cropNodeSpec: computeNodeSpec = {
  name: 'crop',
  displayLabel: 'crop',
  category: 'image editing',
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
  category: 'image editing',
  inputs: [
    {
      name: 'folderPath',
      type: 'string',
      displayLabel: 'folder',
      description: 'Select a folder containing JPEG or PNG images.',
      widget: {
        type: 'FileInputFromServer',
        extensions: [] // Empty array indicates folder selection
      }
    },
    {
      name: 'imageGallery',
      type: 'string[]',
      displayLabel: 'gallery',
      description: 'Select images to process',
      widget: {
        type: 'ImageGallery' // No need for sourcePath here
      }
    }
  ],
  outputs: [
    {
      name: 'processedImage',
      type: 'image',
      displayLabel: 'processed image',
      description: 'The processed image.'
    },
    {
      name: 'outputImages',
      type: 'image[]',
      displayLabel: 'batch results',
      description: 'The processed images.'
    }
  ],

  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      const galleryVar = inputs.imageGallery;

      return `from im2im import Image as IM
from skimage import io
from skimage import img_as_float
import os
from pathlib import Path

folder_path = ${inputs.folderPath}

# Initialize gallery variable
${galleryVar} = None

# Get all images from the folder
image_files = []
for ext in ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']:
    files = [f for f in os.listdir(folder_path) if f.endswith(ext)]
    image_files.extend(files)
image_files.sort()

# Set default selection to first image if available
if image_files:
    ${galleryVar} = [{"filename": image_files[0]}]

# Now use the gallery variable for processing
selected_images = [img["filename"] for img in ${galleryVar}] if ${galleryVar} else []

if selected_images:
    if len(selected_images) == 1:
        image_path = os.path.join(folder_path, selected_images[0])
        # Read image same way as readImageNode
        ${outputs.processedImage} = IM(img_as_float(io.imread(image_path, as_gray=True)), 'numpy.gray_float64(0to1)')
        ${outputs.outputImages} = None
    else:
        # For multiple selections, set last image as outputImage
        last_image_path = os.path.join(folder_path, selected_images[-1])
        ${outputs.processedImage} = IM(img_as_float(io.imread(last_image_path, as_gray=True)), 'numpy.gray_float64(0to1)')
        # Process all selected images for outputImages
        ${outputs.outputImages} = [IM(img_as_float(io.imread(os.path.join(folder_path, img), as_gray=True)), 'numpy.gray_float64(0to1)') for img in selected_images]
else:
    # No images found in folder
    ${outputs.processedImage} = None
    ${outputs.outputImages} = None`;
    }
  }
};
