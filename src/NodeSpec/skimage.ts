import { computeNodeSpec } from '../ReactVP';

export const adjustGamma: computeNodeSpec = {
  name: 'adjustGamma',
  displayLabel: 'Adjust Gamma',
  description: 'Performs gamma correction on an image.',
  category: 'adjust',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image.',
    },
    {
      name: 'gamma',
      displayLabel: 'Gamma',
      description: 'Non-negative real number for gamma correction.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.1,
      },
    }
  ],
  outputs: [
    {
      name: 'adjustedImage',
      type: 'image',
      displayLabel: 'Adjusted Image',
      description: 'Gamma-corrected image.',
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `import skimage.exposure as exposure\n
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.rgb_uint8')\n
${outputs.adjustedImage} = Image(exposure.adjust_gamma(in_im.raw_image, ${inputs.gamma}), 'numpy.rgb_uint8')`;
    },
  },
};

export const adjustLog: computeNodeSpec = {
  name: 'adjustLog',
  displayLabel: 'Adjust Log',
  description: 'Performs logarithmic correction on an image.',
  category: 'adjust',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image.',
    },
    {
      name: 'gain',
      displayLabel: 'Gain',
      description: 'Multiplier for scaling log correction.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.1,
      },
    }
  ],
  outputs: [
    {
      name: 'adjustedImage',
      type: 'image',
      displayLabel: 'Adjusted Image',
      description: 'Log-corrected image.',
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `import skimage.exposure as exposure\n
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.rgb_uint8')
${outputs.adjustedImage} = Image(exposure.adjust_log(in_im.raw_image, gain=${inputs.gain}), 'numpy.rgb_uint8')`;
    },
  },
};


export const equalizeAdaptHist: computeNodeSpec = {
  name: 'equalizeAdaptHist',
  displayLabel: 'Adaptive Histogram Equalization',
  description: 'Performs contrast-limited adaptive histogram equalization (CLAHE) on an image.',
  category: 'adjust',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image for adaptive histogram equalization.',
    }
  ],
  outputs: [
    {
      name: 'equalizedImage',
      type: 'image',
      displayLabel: 'Image',
      description: 'Image after adaptive histogram equalization.',
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const imports = `
import skimage.exposure as exposure
from im2im import Image, im2im
`;
      return `${imports}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
equalized = exposure.equalize_adapthist(in_im.raw_image)
${outputs.equalizedImage} = Image(equalized, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const equalizeHist: computeNodeSpec = {
  name: 'equalizeHist',
  displayLabel: 'Histogram Equalization',
  description: 'Enhances contrast in an image using histogram equalization.',
  category: 'adjust',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image for histogram equalization.',
    }
  ],
  outputs: [
    {
      name: 'equalizedImage',
      type: 'image',
      displayLabel: 'Equalized Image',
      description: 'Image after histogram equalization.',
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const imports = `
import skimage.exposure as exposure
from im2im import Image, im2im
`;
      return `${imports}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
equalized = exposure.equalize_hist(in_im.raw_image)
${outputs.equalizedImage} = Image(equalized, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const blobDoG: computeNodeSpec = {
  name: 'blobDoG',
  displayLabel: 'Blob Detection (DoG)',
  description: 'Detects blobs in an image using the Difference of Gaussian method.',
  category: 'feature detection',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image for blob detection.',
    },
    {
      name: 'minSigma',
      displayLabel: 'Min Sigma',
      description: 'Minimum standard deviation for Gaussian kernel.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0.1,
        step: 0.1,
      },
    },
    {
      name: 'maxSigma',
      displayLabel: 'Max Sigma',
      description: 'Maximum standard deviation for Gaussian kernel.',
      defaultValue: 30.0,
      widget: {
        type: 'Number',
        min: 0.1,
        step: 0.1,
      },
    },
    {
      name: 'threshold',
      displayLabel: 'Threshold',
      description: 'Absolute lower bound for scale-space maxima.',
      defaultValue: 0.1,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.01,
      },
    }
  ],
  outputs: [
    {
      name: 'blobsImage',
      type: 'image',
      displayLabel: 'Blobs Image',
      description: 'Image with detected blobs marked.',
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const imports = `
import skimage.feature as feature
import skimage.draw as draw
import numpy as np
from im2im import Image, im2im
`;
      return `${imports}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
blobs = feature.blob_dog(in_im.raw_image, min_sigma=${inputs.minSigma}, max_sigma=${inputs.maxSigma}, threshold=${inputs.threshold})

result = np.copy(in_im.raw_image)
for y, x, r in blobs:
    rr, cc = draw.disk((y, x), r, shape=in_im.raw_image.shape)
    result[rr, cc] = 1  # Mark blobs in white

${outputs.blobsImage} = Image(result, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const blobDoH: computeNodeSpec = {
  name: 'blobDoH',
  displayLabel: 'Blob Detection (DoH)',
  description: 'Detects blobs in an image using the Determinant of Hessian method.',
  category: 'feature detection',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image for blob detection.',
    },
    {
      name: 'minSigma',
      displayLabel: 'Min Sigma',
      description: 'Minimum standard deviation for Gaussian kernel.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0.1,
        step: 0.1,
      },
    },
    {
      name: 'maxSigma',
      displayLabel: 'Max Sigma',
      description: 'Maximum standard deviation for Gaussian kernel.',
      defaultValue: 30.0,
      widget: {
        type: 'Number',
        min: 0.1,
        step: 0.1,
      },
    },
    {
      name: 'threshold',
      displayLabel: 'Threshold',
      description: 'Absolute lower bound for scale-space maxima.',
      defaultValue: 0.01,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.01,
      },
    }
  ],
  outputs: [
    {
      name: 'blobsImage',
      type: 'image',
      displayLabel: 'Blobs Image',
      description: 'Image with detected blobs marked.',
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const imports = `
import skimage.feature as feature
import skimage.draw as draw
import numpy as np
from im2im import Image, im2im
`;
      return `${imports}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
blobs = feature.blob_doh(in_im.raw_image, min_sigma=${inputs.minSigma}, max_sigma=${inputs.maxSigma}, threshold=${inputs.threshold})

result = np.copy(in_im.raw_image)
for y, x, r in blobs:
    rr, cc = draw.disk((y, x), r, shape=in_im.raw_image.shape)
    result[rr, cc] = 1  # Mark blobs in white

${outputs.blobsImage} = Image(result, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const blobLoG: computeNodeSpec = {
  name: 'blobLoG',
  displayLabel: 'Blob Detection (LoG)',
  description: 'Detects blobs in an image using the Laplacian of Gaussian method.',
  category: 'feature detection',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image for blob detection.',
    },
    {
      name: 'minSigma',
      displayLabel: 'Min Sigma',
      description: 'Minimum standard deviation for Gaussian kernel.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0.1,
        step: 0.1,
      },
    },
    {
      name: 'maxSigma',
      displayLabel: 'Max Sigma',
      description: 'Maximum standard deviation for Gaussian kernel.',
      defaultValue: 30.0,
      widget: {
        type: 'Number',
        min: 0.1,
        step: 0.1,
      },
    },
    {
        name: 'NumSigma',
        displayLabel: 'Num Sigma',
        description: 'Number of intermediate values of sigma.',
        defaultValue: 10,
        widget: {
          type: 'Number',
          min: 1,
          step: 1,
        },
    },
    {
      name: 'threshold',
      displayLabel: 'Threshold',
      description: 'Absolute lower bound for scale-space maxima.',
      defaultValue: 0.1,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.01,
      },
    }
  ],
  outputs: [
    {
      name: 'blobsImage',
      type: 'image',
      displayLabel: 'Blobs Image',
      description: 'Image with detected blobs marked.',
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const imports = `
import skimage.feature as feature
import skimage.draw as draw
import numpy as np
from im2im import Image, im2im
`;
      return `${imports}
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
blobs = feature.blob_log(in_im.raw_image, min_sigma=${inputs.minSigma}, max_sigma=${inputs.maxSigma},num_sigma=${inputs.NumSigma}, threshold=${inputs.threshold})

result = np.copy(in_im.raw_image)
for y, x, r in blobs:
    rr, cc = draw.disk((y, x), r, shape=in_im.raw_image.shape)
    result[rr, cc] = 1  # Mark blobs in white

${outputs.blobsImage} = Image(result, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const cornerHarris: computeNodeSpec = {
  name: 'cornerHarris',
  displayLabel: 'Harris Corner Detection',
  description: 'Detects corners in an image using the Harris corner detection algorithm.',
  category: 'feature detection',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Grayscale input image for corner detection.',
    },
    {
      name: 'k',
      displayLabel: 'Harris Detector Free Parameter',
      description: 'Sensitivity factor to separate corners from edges. Typical values: 0.04 - 0.06.',
      defaultValue: 0.04,
      widget: {
        type: 'Number',
        min: 0.01,
        max: 0.1,
        step: 0.01,
      },
    },
    {
      name: 'threshold',
      displayLabel: 'Threshold',
      description: 'Threshold for detecting strong corners. Expressed as a fraction of max response.',
      defaultValue: 0.01,
      widget: {
        type: 'Number',
        min: 0.001,
        max: 0.1,
        step: 0.001,
      },
    },
  ],
  outputs: [
    {
      name: 'cornersImage',
      type: 'image',
      displayLabel: 'Corners Image',
      description: 'Image with detected corners marked in red.',
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      const imports = `
import numpy as np
import skimage.feature as feature
import skimage.color as color
from im2im import Image, im2im
`;

      return `${imports}
# Convert input image
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')

# Compute Harris corner response
corner_response = feature.corner_harris(in_im.raw_image, k=${inputs.k})

# Normalize and threshold response
threshold_value = ${inputs.threshold} * corner_response.max()
corners = corner_response > threshold_value

# Convert grayscale image to color for marking
marked_image = color.gray2rgb(in_im.raw_image)
marked_image[corners] = [1, 0, 0]  # Mark corners in red
marked_image = (marked_image * 255).astype(np.uint8)
${outputs.cornersImage} = Image(marked_image, 'numpy.rgb_uint8')`;
    },
  },
};

export const adjustSigmoid: computeNodeSpec = {
  name: 'adjustSigmoid',
  displayLabel: 'Adjust Sigmoid',
  description: 'Applies a sigmoid correction to an image.',
  category: 'adjust',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image for sigmoid correction.',
    },
    {
      name: 'cutoff',
      displayLabel: 'Cutoff',
      description: 'Cutoff value in the range [0, 1].',
      defaultValue: 0.5,
      widget: {
        type: 'Number',
        min: 0,
        max: 1,
        step: 0.01,
      },
    }
  ],
  outputs: [
    {
      name: 'adjustedImage',
      type: 'image',
      displayLabel: 'Adjusted Image',
      description: 'Sigmoid corrected image.',
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      const imports = `
import skimage.exposure as exposure
from im2im import Image, im2im
`;
      return `${imports}
in_im = im2im(${inputs.image}, 'numpy.rgb_uint8')
adjusted = exposure.adjust_sigmoid(in_im.raw_image, cutoff=${inputs.cutoff})
${outputs.adjustedImage} = Image(adjusted, 'numpy.rgb_uint8')`;
    },
  },
};


export const farid: computeNodeSpec = {
  name: 'farid',
  displayLabel: 'Farid Filter',
  description: 'Finds edges in an image using the Farid operator.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale or RGB image.',
    }
  ],
  outputs: [
    {
      name: 'edges',
      type: 'image',
      displayLabel: 'Edges',
      description: 'Edge-detected image using the Farid operator.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\n
edges = filters.farid(in_im.raw_image)\n
${outputs.edges} = Image(edges, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const meijering: computeNodeSpec = {
  name: 'meijering',
  displayLabel: 'Meijering Filter',
  description: 'Enhances continuous linear structures.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'enhanced',
      type: 'image',
      displayLabel: 'Enhanced Image',
      description: 'Image with enhanced continuous linear structures.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\n
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\n
enhanced = filters.meijering(in_im.raw_image)\n
${outputs.enhanced} = Image(enhanced, 'numpy.gray_float64(0to1)')`;
    },
  },
};


export const butterworth: computeNodeSpec = {
  name: 'butterworth',
  displayLabel: 'Butterworth Filter',
  description: 'Applies a Butterworth high-pass or low-pass filter.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'filtered',
      type: 'image',
      displayLabel: 'Filtered Image',
      description: 'Image after applying the Butterworth filter.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\n
      
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\n
filtered = filters.butterworth(in_im.raw_image)\n
${outputs.filtered} = Image(filtered, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const frangi: computeNodeSpec = {
  name: 'frangi',
  displayLabel: 'Frangi Filter',
  description: 'Enhances vessel-like structures in an image.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'enhanced',
      type: 'image',
      displayLabel: 'Enhanced Image',
      description: 'Image with enhanced vessel-like structures.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\n
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\n
enhanced = filters.frangi(in_im.raw_image)\n
${outputs.enhanced} = Image(enhanced, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const sobel: computeNodeSpec = {
  name: 'sobel',
  displayLabel: 'Sobel Filter',
  description: 'Finds edges in an image using the Sobel operator.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'edges',
      type: 'image',
      displayLabel: 'Edges',
      description: 'Edge-detected image using the Sobel operator.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\n
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\n
edges = filters.sobel(in_im.raw_image)\n
${outputs.edges} = Image(edges, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const hessian: computeNodeSpec = {
  name: 'hessian',
  displayLabel: 'Hessian Filter',
  description: 'Enhances tubular structures in an image.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'enhanced',
      type: 'image',
      displayLabel: 'Enhanced Image',
      description: 'Image with enhanced tubular structures.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\n
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\n
enhanced = filters.hessian(in_im.raw_image)\n
${outputs.enhanced} = Image(enhanced, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const prewitt: computeNodeSpec = {
  name: 'prewitt',
  displayLabel: 'Prewitt Filter',
  description: 'Finds edges in an image using the Prewitt operator.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'edges',
      type: 'image',
      displayLabel: 'Edges',
      description: 'Edge-detected image using the Prewitt operator.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\n
from im2im import Image, im2im\n
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\n
edges = filters.prewitt(in_im.raw_image)\n
${outputs.edges} = Image(edges, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const roberts: computeNodeSpec = {
  name: 'roberts',
  displayLabel: 'Roberts Filter',
  description: 'Finds edges in an image using the Roberts operator.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'edges',
      type: 'image',
      displayLabel: 'Edges',
      description: 'Edge-detected image using the Roberts operator.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\nfrom im2im import Image, im2im\nin_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\nedges = filters.roberts(in_im.raw_image)\n${outputs.edges} = Image(edges, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const sato: computeNodeSpec = {
  name: 'sato',
  displayLabel: 'Sato Filter',
  description: 'Enhances tubular structures in an image.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'enhanced',
      type: 'image',
      displayLabel: 'Enhanced Image',
      description: 'Image with enhanced tubular structures.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\nfrom im2im import Image, im2im\nin_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\nenhanced = filters.sato(in_im.raw_image)\n${outputs.enhanced} = Image(enhanced, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const scharr: computeNodeSpec = {
  name: 'scharr',
  displayLabel: 'Scharr Filter',
  description: 'Finds edges in an image using the Scharr operator.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input grayscale image.',
    }
  ],
  outputs: [
    {
      name: 'edges',
      type: 'image',
      displayLabel: 'Edges',
      description: 'Edge-detected image using the Scharr operator.',
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, any>, outputs: Record<string, any>) => {
      return `import skimage.filters as filters\nfrom im2im import Image, im2im\nin_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')\nedges = filters.scharr(in_im.raw_image)\n${outputs.edges} = Image(edges, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const blackTophat: computeNodeSpec = {
  name: 'blackTophat',
  displayLabel: 'Black Top-Hat',
  description: 'Performs black top-hat morphological operation to enhance dark objects on a bright background.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Grayscale input image.',
    },
    {
      name: 'selem',
      displayLabel: 'Structuring Element',
      description: 'Shape used for the morphological operation.',
      defaultValue: 'disk',
      widget: {
        type: 'Dropdown',
        options: ['disk', 'square', 'diamond', 'octagon'],
      },
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'image',
      displayLabel: 'Result',
      description: 'Processed image with black top-hat transformation applied.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.morphology as morph
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
selem = morph.${inputs.selem}(3)
result = morph.black_tophat(in_im.raw_image, selem)
${outputs.result} = Image(result, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const whiteTophat: computeNodeSpec = {
  name: 'whiteTophat',
  displayLabel: 'White Top-Hat',
  description: 'Performs white top-hat morphological operation to enhance bright objects on a dark background.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Grayscale input image.',
    },
    {
      name: 'selem',
      displayLabel: 'Structuring Element',
      description: 'Shape used for the morphological operation.',
      defaultValue: 'disk',
      widget: {
        type: 'Dropdown',
        options: ['disk', 'square', 'diamond', 'octagon'],
      },
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'image',
      displayLabel: 'Result',
      description: 'Processed image with white top-hat transformation applied.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.morphology as morph
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
selem = morph.${inputs.selem}(3)
result = morph.white_tophat(in_im.raw_image, selem)
${outputs.result} = Image(result, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const radonTransform: computeNodeSpec = {
  name: 'radonTransform',
  displayLabel: 'Radon Transform',
  description: 'Computes the Radon transform of an image.',
  category: 'transform',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Grayscale input image.',
    },
  ],
  outputs: [
    {
      name: 'radonImage',
      type: 'image',
      displayLabel: 'Radon Image',
      description: 'Radon transform of the input image.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.transform as transform
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
radon_image = (transform.radon(in_im.raw_image))/255
#radon_image = (radon_image - radon_image.min()) / (radon_image.max() - radon_image.min())
${outputs.radonImage} = Image(radon_image, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const iradonTransform: computeNodeSpec = {
  name: 'iradonTransform',
  displayLabel: 'Inverse Radon Transform',
  description: 'Performs inverse Radon transform to reconstruct an image from its sinogram.',
  category: 'transform',
  inputs: [
    {
      name: 'radonImage',
      type: 'image',
      displayLabel: 'Radon Image',
      description: 'Sinogram image obtained from the Radon transform.',
    },
  ],
  outputs: [
    {
      name: 'reconstructed',
      type: 'image',
      displayLabel: 'Reconstructed Image',
      description: 'Reconstructed grayscale image.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.transform as transform
from im2im import Image, im2im

in_radon = im2im(${inputs.radonImage}, 'numpy.gray_float64(0to1)')
radon_image = in_radon.raw_image * 255

reconstructed = transform.iradon(radon_image)
reconstructed[reconstructed < 0] = 0
reconstructed[reconstructed > 1] = 1
${outputs.reconstructed} = Image((reconstructed*255).astype(np.uint8), 'numpy.rgb_uint8')`;
    },
  },
};

export const iradonSART: computeNodeSpec = {
  name: 'iradonSART',
  displayLabel: 'Inverse Radon Transform (SART)',
  description: 'Performs iterative SART algorithm for inverse Radon transform.',
  category: 'transform',
  inputs: [
    {
      name: 'radonImage',
      type: 'image',
      displayLabel: 'Radon Image',
      description: 'Sinogram image obtained from the Radon transform.',
    },
  ],
  outputs: [
    {
      name: 'reconstructed',
      type: 'image',
      displayLabel: 'Reconstructed Image',
      description: 'Reconstructed grayscale image using SART algorithm.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.transform as transform
from im2im import Image, im2im

in_radon = im2im(${inputs.radonImage}, 'numpy.gray_float64(0to1)')

radon_image = in_radon.raw_image *255

reconstructed = transform.iradon_sart(radon_image)
reconstructed[reconstructed < 0] = 0
reconstructed[reconstructed > 1] = 1
${outputs.reconstructed} = Image((reconstructed*255).astype(np.uint8), 'numpy.gray_float64(0to1)')`;
    },
  },
};

  
export const randomNoise: computeNodeSpec = {
  name: 'randomNoise',
  displayLabel: 'Random Noise',
  description: 'Adds random noise to an image.',
  category: 'Image Processing',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Input image to which noise will be added.',
    },
    {
      name: 'mode',
      displayLabel: 'Noise Mode',
      description: 'Type of noise to apply.',
      defaultValue: 'gaussian',
      widget: {
        type: 'Dropdown',
        options: ['gaussian', 'salt', 'pepper', 's&p', 'speckle'],
      },
    },
  ],
  outputs: [
    {
      name: 'noisyImage',
      type: 'image',
      displayLabel: 'Noisy Image',
      description: 'Image with added noise.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.util as util
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.rgb_uint8')
noisy = util.random_noise(in_im.raw_image, mode='${inputs.mode}')
${outputs.noisyImage} = Image((noisy* 255).astype(np.uint8), 'numpy.rgb_uint8')`;
    },
  },
};

export const denoiseWiener: computeNodeSpec = {
  name: 'denoiseWiener',
  displayLabel: 'Wiener Filter Denoising',
  description: 'Applies Wiener filter for denoising an image.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Noisy input image.',
    },
  ],
  outputs: [
    {
      name: 'denoisedImage',
      type: 'image',
      displayLabel: 'Denoised Image',
      description: 'Image after Wiener filter denoising.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.restoration as restoration
import numpy as np
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
psf = np.ones((5, 5)) / 25
denoised = restoration.wiener(in_im.raw_image, psf, 0.1)
${outputs.denoisedImage} = Image(denoised, 'numpy.gray_float64(0to1)')`;
    },
  },
};


export const denoiseNlMeans: computeNodeSpec = {
  name: 'denoiseNlMeans',
  displayLabel: 'Non-Local Means Denoising',
  description: 'Applies non-local means denoising on an image.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Noisy input image.',
    },
  ],
  outputs: [
    {
      name: 'denoisedImage',
      type: 'image',
      displayLabel: 'Denoised Image',
      description: 'Image after non-local means denoising.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.restoration as restoration
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
denoised = restoration.denoise_nl_means(in_im.raw_image)
${outputs.denoisedImage} = Image(denoised, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const denoiseTvBregman: computeNodeSpec = {
  name: 'denoiseTvBregman',
  displayLabel: 'Total Variation Denoising (Bregman)',
  description: 'Applies total variation denoising using the Bregman iteration.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Noisy input image.',
    },
  ],
  outputs: [
    {
      name: 'denoisedImage',
      type: 'image',
      displayLabel: 'Denoised Image',
      description: 'Image after Bregman total variation denoising.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.restoration as restoration
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
denoised = restoration.denoise_tv_bregman(in_im.raw_image, weight=10)
${outputs.denoisedImage} = Image(denoised, 'numpy.gray_float64(0to1)')`;
    },
  },
};

export const denoiseTvChambolle: computeNodeSpec = {
  name: 'denoiseTvChambolle',
  displayLabel: 'Total Variation Denoising (Chambolle)',
  description: 'Applies total variation denoising using the Chambolle method.',
  category: 'denoise & enhance',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'Image',
      description: 'Noisy input image.',
    },
  ],
  outputs: [
    {
      name: 'denoisedImage',
      type: 'image',
      displayLabel: 'Denoised Image',
      description: 'Image after Chambolle total variation denoising.',
    },
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import skimage.restoration as restoration
from im2im import Image, im2im

in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
denoised = restoration.denoise_tv_chambolle(in_im.raw_image, weight=0.1)
${outputs.denoisedImage} = Image(denoised, 'numpy.gray_float64(0to1)')`;
    },
  },
};