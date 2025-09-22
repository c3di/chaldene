import { type computeNodeSpec } from '../ReactVP';

function header(): string {
  return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize a single ImageJ2 gateway (no legacy needed for ops)
try:
    ij
except NameError:
    ij = imagej.init(mode='headless')
`;
}

function toJavaImage(varNameIn: string = 'image'): string {
  return `in_im = im2im(${varNameIn}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)
# Ensure RealType image for ops (Float32)
jimg = ij.op().run('convert.float32', jimg)
`;
}

function fromJavaToIM(outVar: string, outName: string): string {
  return `out_xr = ij.py.from_java(${outVar})
out_np = getattr(out_xr, 'values', out_xr)
# Normalize to [0,1] for consistent downstream visualization
arr = np.asarray(out_np)
if np.issubdtype(arr.dtype, np.floating):
    vmin = float(arr.min()) if arr.size else 0.0
    vmax = float(arr.max()) if arr.size else 1.0
    if vmax > vmin:
        arrn = (arr - vmin) / (vmax - vmin)
    else:
        arrn = np.zeros_like(arr, dtype='float64')
else:
    arr = arr.astype('float64', copy=False)
    vmax = float(arr.max()) if arr.size else 1.0
    arrn = (arr / vmax) if vmax > 0 else np.zeros_like(arr)
${outName} = IM(arrn, in_im.metadata)`;
}

export const ijGaussNodeSpec: computeNodeSpec = {
  name: 'ij_gauss',
  displayLabel: 'imagej_gauss',
  description: 'Gaussian blur using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image', description: 'Input image.' },
    { name: 'sigma', displayLabel: 'sigma', description: 'Gaussian sigma.', defaultValue: 1.0, widget: { type: 'Number', min: 0, step: 0.1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image', description: 'Blurred image.' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().filter().gauss(jimg, float(${inputs.sigma}))
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

export const ijMedianNodeSpec: computeNodeSpec = {
  name: 'ij_median',
  displayLabel: 'imagej_median',
  description: 'Median filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image', description: 'Input image.' },
    { name: 'radius', displayLabel: 'radius', description: 'Neighborhood radius (pixels).', defaultValue: 1, widget: { type: 'Number', min: 1, step: 1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}rad = int(${inputs.radius})
from scyjava import jimport
HyperSphereShape = jimport('net.imglib2.algorithm.neighborhood.HyperSphereShape')
shape = HyperSphereShape(rad)
out = ij.op().run('create.img', jimg)
ij.op().run('filter.median', out, jimg, shape)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijMeanNodeSpec: computeNodeSpec = {
  name: 'ij_mean',
  displayLabel: 'imagej_mean',
  description: 'Mean filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'radius', displayLabel: 'radius', description: 'Neighborhood radius (pixels).', defaultValue: 1, widget: { type: 'Number', min: 1, step: 1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}rad = int(${inputs.radius})
from scyjava import jimport
HyperSphereShape = jimport('net.imglib2.algorithm.neighborhood.HyperSphereShape')
shape = HyperSphereShape(rad)
out = ij.op().run('create.img', jimg)
ij.op().run('filter.mean', out, jimg, shape)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijSobelNodeSpec: computeNodeSpec = {
  name: 'ij_sobel',
  displayLabel: 'imagej_sobel',
  description: 'Sobel edge filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().filter().sobel(jimg)
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

export const ijBilateralNodeSpec: computeNodeSpec = {
  name: 'ij_bilateral',
  displayLabel: 'imagej_bilateral',
  description: 'Bilateral filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'spatial_sigma', displayLabel: 'spatial sigma', defaultValue: 2.0, widget: { type: 'Number', min: 0, step: 0.1 } },
    { name: 'range_sigma', displayLabel: 'range sigma', defaultValue: 0.1, widget: { type: 'Number', min: 0, step: 0.01 } },
    { name: 'radius', displayLabel: 'radius', defaultValue: 2, widget: { type: 'Number', min: 1, step: 1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}out = ij.op().run('create.img', jimg)
# Op signature: out, in, sigmaR (range), sigmaS (spatial), radius
ij.op().run('filter.bilateral', out, jimg, float(${inputs.range_sigma}), float(${inputs.spatial_sigma}), int(${inputs.radius}))
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijDoGNodeSpec: computeNodeSpec = {
  name: 'ij_dog',
  displayLabel: 'imagej_dog',
  description: 'Difference of Gaussians using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'sigma1', displayLabel: 'sigma1', defaultValue: 1.0, widget: { type: 'Number', min: 0, step: 0.1 } },
    { name: 'sigma2', displayLabel: 'sigma2', defaultValue: 2.0, widget: { type: 'Number', min: 0, step: 0.1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().filter().dog(jimg, float(${inputs.sigma1}), float(${inputs.sigma2}))
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

export const ijVarianceNodeSpec: computeNodeSpec = {
  name: 'ij_variance',
  displayLabel: 'imagej_variance',
  description: 'Local variance filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'radius', displayLabel: 'radius', defaultValue: 1, widget: { type: 'Number', min: 1, step: 1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}rad = int(${inputs.radius})
from scyjava import jimport
HyperSphereShape = jimport('net.imglib2.algorithm.neighborhood.HyperSphereShape')
shape = HyperSphereShape(rad)
out = ij.op().run('create.img', jimg)
ij.op().run('filter.variance', out, jimg, shape)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijMaxNodeSpec: computeNodeSpec = {
  name: 'ij_max',
  displayLabel: 'imagej_max',
  description: 'Local maximum filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'radius', displayLabel: 'radius', defaultValue: 1, widget: { type: 'Number', min: 1, step: 1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}rad = int(${inputs.radius})
from scyjava import jimport
HyperSphereShape = jimport('net.imglib2.algorithm.neighborhood.HyperSphereShape')
shape = HyperSphereShape(rad)
out = ij.op().run('create.img', jimg)
ij.op().run('filter.max', out, jimg, shape)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijMinNodeSpec: computeNodeSpec = {
  name: 'ij_min',
  displayLabel: 'imagej_min',
  description: 'Local minimum filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'radius', displayLabel: 'radius', defaultValue: 1, widget: { type: 'Number', min: 1, step: 1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}rad = int(${inputs.radius})
from scyjava import jimport
HyperSphereShape = jimport('net.imglib2.algorithm.neighborhood.HyperSphereShape')
shape = HyperSphereShape(rad)
out = ij.op().run('create.img', jimg)
ij.op().run('filter.min', out, jimg, shape)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};


export const ijAddPoissonNoiseNodeSpec: computeNodeSpec = {
  name: 'ij_add_poisson_noise',
  displayLabel: 'imagej_add_poisson_noise',
  description: 'Add Poisson noise using ImageJ ops.',
  category: 'imagej ops',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}out = ij.op().run('create.img', jimg)
ij.op().filter().addPoissonNoise(out, jimg)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijConvolveNodeSpec: computeNodeSpec = {
  name: 'ij_convolve',
  displayLabel: 'imagej_convolve',
  description: 'Convolve with a box kernel using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'kernel_size', displayLabel: 'kernel size', defaultValue: 3, widget: { type: 'Number', min: 1, step: 1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}ks = int(${inputs.kernel_size})
if ks < 1:
    ks = 1
kernel_np = np.ones((ks, ks), dtype='float32') / float(ks * ks)
kernel = ij.py.to_java(kernel_np)
res = ij.op().filter().convolve(jimg, kernel)
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};


export const ijTubenessNodeSpec: computeNodeSpec = {
  name: 'ij_tubeness',
  displayLabel: 'imagej_tubeness',
  description: 'Tubeness filter using ImageJ ops.',
  category: 'imagej ops',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'sigma', displayLabel: 'sigma', defaultValue: 1.0, widget: { type: 'Number', min: 0, step: 0.1 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().filter().tubeness(jimg, float(${inputs.sigma}))
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

// Threshold ops: apply and various global/local methods
// Threshold nodes moved to ImageJThreshold.ts




