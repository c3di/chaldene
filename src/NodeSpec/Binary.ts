import { computeNodeSpec } from '../ReactVP';

export const autoBinarizeNodeSpec: computeNodeSpec = {
  name: 'auto binarize',
  displayLabel: 'auto binarize',
  description:
    'Automatically binarize the input image using Otsu thresholding.',
  category: 'binary',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image to be binarized.'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'image',
      description: 'The binarized output image.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.filters import threshold_isodata
from im2im import Image as IM
from skimage.color import gray2rgb
import numpy as np
 
in_im = im2im(${inputs.image}, 'numpy.rgb_uint8')
threshold = threshold_isodata(np.asarray(in_im.raw_image))
${outputs.image} = IM(( in_im.raw_image> threshold).astype(int).astype(np.uint8)*255, 'numpy.rgb_uint8')
`;
    }
  }
};

export const thresholdNodeSpec: computeNodeSpec = {
  name: 'threshold',
  displayLabel: 'threshold',
  category: 'binary',
  description:
    'Generates a binary image by applying thresholding to the input image using specified upper and lower bounds. Pixels with values within the range are set to 1, while those outside the range are set to 0.',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'grayscale image',
      description: 'The input image for thresholding.'
    },
    {
      name: 'range',
      type: 'tuple2',
      displayLabel: 'Range',
      description: 'The threshold bounds for binarization (lower, upper).',
      defaultValue: [0.2, 0.8],
      widget: {
        type: 'HistogramRange',
        min: 0,
        max: 1,
        step: 0.01
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
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

# Get input image
in_im = ${inputs.image}
lower, upper = ${inputs.range}  

# Apply threshold directly to raw image
binarized_image = np.where((in_im.raw_image >= lower) & 
                          (in_im.raw_image <= upper), 1.0, 0.0)

# Create output image with same metadata as input
${outputs.image} = IM(binarized_image, in_im.metadata)`;
    }
  }
};

export const invertNodeSpec: computeNodeSpec = {
  name: 'Invert',
  displayLabel: 'invert',
  description:
    'In a binary image, each pixel is either black (0) or white (1). The invert operation switches these values: all black pixels become white, and all white pixels become black.',
  category: 'binary',
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'The input image to be inverted.'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
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
export const binaryDilationNodeSpec: computeNodeSpec = {
  name: 'binary dilation',
  displayLabel: 'binary dilation',
  description:
    'Dilation sets a pixel at to the maximum over all pixels in the neighborhood centered at. Dilation enlarges bright regions and shrinks dark regions.',
  category: 'binary',
  extraRun: 0,
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'image',
      description: 'The dilated output image.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import morphology
from im2im import Image as IM
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.binary_dilation(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const binaryErosionNodeSpec: computeNodeSpec = {
  name: 'binary erosion',
  displayLabel: 'binary erosion',
  description:
    'Erosion sets a pixel at to the minimum over all pixels in the neighborhood centered at. Erosion shrinks bright regions and enlarges dark regions.',
  category: 'binary',
  extraRun: 1,
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'The eroded output image.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import morphology
from im2im import Image as IM
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.binary_erosion(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const binaryOpeningNodeSpec: computeNodeSpec = {
  name: 'binary opening',
  displayLabel: 'binary opening',
  description:
    'Opening can remove small bright spots (i.e. "salt") and connect small dark cracks. This tends to "open" up (dark) gaps between (bright) features.',
  category: 'binary',
  extraRun: 1,
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'image',
      description: 'The opened output image.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import morphology
from im2im import Image as IM
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.binary_opening(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const binaryClosingNodeSpec: computeNodeSpec = {
  name: 'binary closing',
  displayLabel: 'binary closing',
  description:
    'Closing can remove small dark spots (i.e. "pepper") and connect small bright cracks. This tends to "close" up (dark) gaps between (bright) features.',
  category: 'binary',
  extraRun: 1,
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image'
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'image',
      description: 'The closed output image.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import morphology
from im2im import Image as IM
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.binary_closing(in_im.raw_image), in_im.metadata)`;
    }
  }
};

export const removeSmallHolesNodeSpec: computeNodeSpec = {
  name: 'remove small holes',
  displayLabel: 'remove small holes',
  description:
    'Remove small holes (connected regions of background) within foreground objects in a binary image. It fills in small "holes" or gaps inside objects that you might want to close.',
  category: 'binary',
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image'
    },
    {
      name: 'area_threshold',
      displayLabel: 'area threshold',
      description:
        'The maximum area, in pixels, of a contiguous hole that will be filled.',
      defaultValue: 64,
      widget: {
        type: 'Number',
        min: 0,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'image',
      description:
        'The input image with small holes within connected components removed.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import morphology
from im2im import Image as IM
from numpy import float64
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.remove_small_holes(in_im.raw_image.astype(bool), area_threshold=${inputs.area_threshold}).astype(float64), in_im.metadata)`;
    }
  }
};

export const removeSmallObjectsNodeSpec: computeNodeSpec = {
  name: 'remove small objects',
  displayLabel: 'remove small objects',
  description:
    'Remove small objects (connected regions of foreground) in a binary image. It removes small, isolated objects that are smaller than a specified threshold.',
  category: 'binary',
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image'
    },
    {
      name: 'min_size',
      displayLabel: 'min size',
      description: 'Objects smaller than this size will be removed',
      defaultValue: 64,
      widget: {
        type: 'Number',
        min: 0,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'image',
      description: 'The input image with small connected components removed.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import morphology
from im2im import Image as IM
from numpy import float64
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(morphology.remove_small_objects(in_im.raw_image.astype(bool), min_size=${inputs.min_size}).astype(float64), in_im.metadata)`;
    }
  }
};

export const splitTouchingObjectsNodeSpec: computeNodeSpec = {
  name: 'split touching objects',
  displayLabel: 'split touching objects',
  description:
    'split touching objects (connected regions of foreground) in a binary image. It splits objects that are touching or overlapping.',
  category: 'binary',
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image'
    },
    {
      name: 'sigma',
      displayLabel: 'sigma',
      description:
        'The standard deviation of the Gaussian kernel used for smoothing the image.',
      defaultValue: 3.5,
      widget: {
        type: 'Number',
        min: 0,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'image',
      description: 'The input image with small connected components removed.',
      showDiff: true
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `import numpy as np
from scipy import ndimage as ndi
from skimage.filters import sobel, gaussian
from skimage.feature import peak_local_max
from skimage.measure import label
from skimage.segmentation import watershed
from skimage.morphology import binary_opening
from numpy import float64
from im2im import Image as IM

def split_touching_objects(binary, sigma: float = 3.5):
    """
    Takes a binary image and draws cuts in the objects similar to the ImageJ watershed algorithm [1].
    https://github.com/haesleinhuepf/napari-segment-blobs-and-things-with-membranes/blob/5514d8d1de5964c835e7f71ac257b8b3f0574b90/napari_segment_blobs_and_things_with_membranes/__init__.py#L115C1-L149C37
    """
    binary = np.asarray(binary)

    # typical way of using scikit-image watershed
    distance = ndi.distance_transform_edt(binary)
    blurred_distance = gaussian(distance, sigma=sigma)
    fp = np.ones((3,) * binary.ndim)
    coords = peak_local_max(blurred_distance, footprint=fp, labels=binary)
    mask = np.zeros(distance.shape, dtype=bool)
    mask[tuple(coords.T)] = True
    markers = label(mask)
    labels = watershed(-blurred_distance, markers, mask=binary)

    # identify label-cutting edges
    if len(binary.shape) == 2:
        edges = sobel(labels)
        edges2 = sobel(binary)
    else:
        raise NotImplementedError("Only 2D binary images are supported.")

    almost = np.logical_not(np.logical_xor(edges != 0, edges2 != 0)) * binary
    return binary_opening(almost)

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
${outputs.image} = IM(split_touching_objects(in_im.raw_image.astype(bool), sigma=${inputs.sigma}).astype(float64), in_im.metadata)`;
    }
  }
};
