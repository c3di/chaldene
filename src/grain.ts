/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { registerNodeSpec, type computeNodeSpec } from './ReactVP';

export const readImageNodeSpec: computeNodeSpec = {
  name: 'read_image',
  displayLabel: 'read image',
  description:
    'Reads a RGB or grayscale JPEG or PNG image. Optionally converts the image to the desired format.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'path',
      type: 'string',
      displayLabel: 'file',
      description: 'path(str) - path of the JPEG or PNG image.',
      widget: {
        type: 'FileInputFromServer',
        extensions: ['.jpg', '.jpeg', '.png']
      }
    },
    {
      name: 'mode',
      displayLabel: 'mode',
      description:
        'mode(ImageReadMode) - The read mode used for optionally converting the image. Default: RGB.',
      defaultValue: 'GRAY',
      widget: {
        type: 'Dropdown',
        options: ['GRAY', 'RGB']
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
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import io';
      const import2 = 'from im2im import Image as IM';
      const import3 = 'from im2im import get_possible_metadata';

      if (inputs.mode === 'RGB') {
        return `${import1}
${import2}
${import3}
${outputs.image} = IM(io.imread(${inputs.path}, as_gray=False), 'numpy.rgb_uint8')`;
      }
      return `${import1}
${import2}
${import3}
${outputs.image} = IM(io.imread(${inputs.path}, as_gray=True), 'numpy.gray_float64(0to1)')`;
    }
  }
};

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

export const thresholdNodeSpec: computeNodeSpec = {
  name: 'threshold',
  displayLabel: 'threshold',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image'
    },
    {
      name: 'upper',
      displayLabel: 'upper',
      description: 'Upper threshold value.',
      defaultValue: 1,
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
      description: 'Lower threshold value.',
      defaultValue: 0,
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
      displayLabel: 'image',
      description: 'The thresholded output image.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'import numpy as np';
      const import2 = 'from im2im import Image as IM';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(np.clip(in_im.raw_image, ${inputs.lower}, ${inputs.upper}), in_im.metadata)`;
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
      const import1 = 'from skimage.exposure import equalize_adapthist'
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
  description:
    'Edge filter an image using the Canny algorithm.',
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
    }
  ],

  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage.feature import canny'
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

export const watersheedNodeSpec: computeNodeSpec = {
  name: 'watershed',
  displayLabel: 'watershed segmentation',
  description: 'Applies watershed segmentation to the input image.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image for watershed segmentation.'
    },
    {
      name: 'granularity',
      displayLabel: 'granularity',
      description: 'The granularity parameter for watershed segmentation.',
      defaultValue: 0.1,
      widget: {
        type: 'Number',
        step: 0.1
      }
    }
  ],
  outputs: [
    {
      name: 'segments',
      type: 'segments',
      displayLabel: 'segments',
      description: 'The label map produced by watershed segmentation.'
    },
    {
      name: 'vis',
      type: 'image',
      description: 'The visualization of the watershed segmentation.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import segmentation, filters';
      const import2 = 'from scipy import ndimage as ndi';

      return `${import1}
${import2}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
gradient = filters.sobel(in_im.raw_image)
markers = ndi.label(gradient < ${inputs.granularity})[0]
${outputs.segments} = segmentation.watershed(gradient, markers)
${outputs.vis} = IM(segmentation.mark_boundaries(in_im.raw_image, ${outputs.segments}), {**in_im.metadata, 'color_channel': 'rgb', 'channel_order': 'channel last'})`;
    }
  }
};

export const regionpropsNodeSpec: computeNodeSpec = {
  name: 'regionprops',
  displayLabel: 'summary',
  description: 'Extract region properties from labeled regions of an image.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'segments',
      type: 'segments',
      displayLabel: 'segments',
      description: 'The labeled regions of the image.'
    }
  ],
  outputs: [
    {
      name: 'summary',
      type: 'summary',
      displayLabel: 'summary',
      description: 'The region properties of the labeled regions.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import measure
import pandas as pd
from IPython.display import display
${outputs.summary} = measure.regionprops_table(${inputs.segments}, properties=['label', 'area', 'num_pixels'])
data = pd.DataFrame(${outputs.summary})
total_labels = len(data['label'])
average_area = data['area'].mean()
average_num_pixels = data['num_pixels'].mean()
print(f"Total Labels: {total_labels}")
print(f"Average Area: {average_area}")
print(f"Average Number of Pixels: {average_num_pixels}")
pd.set_option('display.max_rows', len(data))
display(data.style.hide(axis='index'))`;
    }
  }
};

export const saveToCsvNodeSpec: computeNodeSpec = {
  name: 'save_to_csv',
  displayLabel: 'save to csv',
  description: 'Save the input data to a CSV file.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'data',
      type: 'summary',
      displayLabel: 'data',
      description: 'The data to save as a CSV.'
    },
    {
      name: 'file',
      type: 'string',
      displayLabel: 'file',
      description: 'Save to this file.',
      widget: {
        type: 'FileInputFromServer',
        extensions: ['.csv']
      }
    }
  ],
  outputs: [],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'import pandas as pd';

      return `${import1}
pd.DataFrame(${inputs.data}).to_csv(${inputs.file}, index=False)`;
    }
  }
};


export const saveImageNodeSpec: computeNodeSpec = {
  name: 'save_image',
  displayLabel: 'save image',
  description: 'Save the image data to a file.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The image to save.'
    },
    {
      name: 'name',
      type: 'string',
      displayLabel: 'name',
      description: 'PNG File to save the image.',
      defaultValue: 'image.png',
      widget: {
        type: 'String',
        placeholder: 'for example: image.png'
      }
    },
    {
      name: 'destination',
      type: 'string',
      displayLabel: 'destination',
      description: 'Save to this file.',
      widget: {
        type: 'FileInputFromServer',
        extensions: []
      }
    }
  ],
  outputs: [],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import io
from os.path import join
in_im = im2im(${inputs.image}, 'numpy.uint8')
io.imsave(join(${inputs.destination}, ${inputs.name}), in_im.raw_image)`;
    }
  }
};


export function defaultNodeSpecs(): void {
  registerNodeSpec(readImageNodeSpec);
  registerNodeSpec(thresholdNodeSpec);
  registerNodeSpec(dilationNodeSpec);
  registerNodeSpec(erosionNodeSpec);
  registerNodeSpec(openingNodeSpec);
  registerNodeSpec(denoiseBilateralNodeSpec);
  registerNodeSpec(CLAHENodeSpec);
  registerNodeSpec(CannyNodeSpec);
  registerNodeSpec(invertNodeSpec);
  registerNodeSpec(watersheedNodeSpec);
  registerNodeSpec(regionpropsNodeSpec);
  registerNodeSpec(saveToCsvNodeSpec);
  registerNodeSpec(saveImageNodeSpec);
}
