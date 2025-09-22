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

export const ijThresholdApplyNodeSpec: computeNodeSpec = {
  name: 'ij_threshold_apply',
  displayLabel: 'imagej_threshold_apply',
  description: 'Apply a numeric threshold producing a binary image.',
  category: 'imagej threshold',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'threshold', displayLabel: 'threshold (0-1)', defaultValue: 0.5, widget: { type: 'Number', min: 0, max: 1, step: 0.01 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'mask' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}# Create BitType output for binary threshold result
from scyjava import jimport
BitType = jimport('net.imglib2.type.logic.BitType')
FloatType = jimport('net.imglib2.type.numeric.real.FloatType')
out = ij.op().run('create.img', jimg, BitType())
# Use a FloatType threshold to match the FloatType image and avoid casting issues
thresh_val = FloatType(float(${inputs.threshold}))
ij.op().run('threshold.apply', out, jimg, thresh_val)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};


export const ijThresholdPercentileNodeSpec: computeNodeSpec = {
  name: 'ij_threshold_percentile',
  displayLabel: 'imagej_threshold_percentile',
  description: 'Percentile global threshold (fraction 0..1).',
  category: 'imagej threshold',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'fraction', displayLabel: 'fraction (0-1)', defaultValue: 0.5, widget: { type: 'Number', min: 0, max: 1, step: 0.01 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'mask' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}# Create BitType output for binary threshold result
from scyjava import jimport
BitType = jimport('net.imglib2.type.logic.BitType')
FloatType = jimport('net.imglib2.type.numeric.real.FloatType')
out = ij.op().run('create.img', jimg, BitType())
frac = FloatType(float(${inputs.fraction}))
ij.op().run('threshold.percentile', out, jimg, frac)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijThresholdCombinedNodeSpec: computeNodeSpec = {
  name: 'ij_threshold_combined',
  displayLabel: 'imagej_threshold',
  description: 'Apply ImageJ threshold using a selected method.',
  category: 'imagej threshold',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    {
      name: 'method',
      displayLabel: 'method',
      widget: { type: 'Dropdown', options: [
        'huang','intermodes','isoData','li','maxEntropy','maxLikelihood','mean','minError','minimum','moments','otsu','renyiEntropy','rosin','shanbhag','triangle','yen'
      ] },
      defaultValue: 'otsu'
    },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'mask' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}# Create BitType output for binary threshold result
from scyjava import jimport
BitType = jimport('net.imglib2.type.logic.BitType')
FloatType = jimport('net.imglib2.type.numeric.real.FloatType')
out = ij.op().run('create.img', jimg, BitType())

method = "${inputs.method}".strip()
ij.op().run(f'threshold.{method}', out, jimg)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};


