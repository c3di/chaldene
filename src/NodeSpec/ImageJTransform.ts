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

// Helper for Intervals from (x, y, w, h)
function interval2D(xExpr: string, yExpr: string, wExpr: string, hExpr: string): string {
  return `from scyjava import jimport
Intervals = jimport('net.imglib2.util.Intervals')
x0 = int(${xExpr}); y0 = int(${yExpr}); w = int(${wExpr}); h = int(${hExpr})
if w < 1: w = 1
if h < 1: h = 1
x1 = x0 + w - 1
y1 = y0 + h - 1
iv = Intervals.createMinMax(int(x0), int(y0), int(x1), int(y1))`;
}



export const ijTransformConcatenateViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_concatenateView',
  displayLabel: 'imagej_concatenate_view',
  description: 'Concatenate two images along an axis as a virtual view.',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image A' },
    { name: 'image2', type: 'image', displayLabel: 'image B' },
    { name: 'axis', displayLabel: 'axis', defaultValue: 0, widget: { type: 'Dropdown', options: [0, 1] } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}# second image
in_im2 = im2im(${inputs.image2}, 'numpy.gray_float64(0to1)')
jimg2 = ij.py.to_java(in_im2.raw_image)
jimg2 = ij.op().run('convert.float32', jimg2)
from scyjava import jimport
Arrays = jimport('java.util.Arrays')
Intervals = jimport('net.imglib2.util.Intervals')

# Zero-min both inputs
a = ij.op().transform().zeroMinView(jimg)
b = ij.op().transform().zeroMinView(jimg2)

axis = int(${inputs.axis})
w = int(min(a.dimension(0), b.dimension(0)))
h = int(min(a.dimension(1), b.dimension(1)))
if w < 1: w = 1
if h < 1: h = 1
iv = Intervals.createMinMax(0, 0, w - 1, h - 1)
a2 = ij.op().transform().intervalView(a, iv)
b2 = ij.op().transform().intervalView(b, iv)
lst = Arrays.asList(a2, b2)
res = ij.op().transform().concatenateView(lst, int(axis))

# Ensure zero-min and materialize before Python conversion
try:
    res = ij.op().transform().zeroMinView(res)
    out = ij.op().run('copy.rai', res)
    out_xr = ij.py.from_java(out)
    out_np = getattr(out_xr, 'values', out_xr)
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
    ${outputs.image} = IM(arrn, in_im.metadata)
except Exception:
    # Robust fallback: do concatenation in NumPy
    arrA = np.asarray(ij.py.from_java(a2 if 'a2' in locals() else a))
    arrB = np.asarray(ij.py.from_java(b2 if 'b2' in locals() else b))
    ax = int(axis)
    ax = max(0, min(arrA.ndim - 1, ax))
    # Crop to common shape along non-concat axes
    common_shape = list(arrA.shape)
    common_shape = [min(arrA.shape[i], arrB.shape[i]) if i != ax else -1 for i in range(arrA.ndim)]
    slicerA = tuple(slice(0, common_shape[i]) if common_shape[i] != -1 else slice(None) for i in range(arrA.ndim))
    slicerB = tuple(slice(0, common_shape[i]) if common_shape[i] != -1 else slice(None) for i in range(arrB.ndim))
    arrC = np.concatenate([arrA[slicerA], arrB[slicerB]], axis=ax)
    ${outputs.image} = IM(arrC.astype('float64', copy=False), in_im.metadata)
`;
    }
  }
};

export const ijTransformCropNodeSpec: computeNodeSpec = {
  name: 'ij_transform_crop',
  displayLabel: 'imagej_crop',
  description: 'Crop to a rectangular interval (2D).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'x', displayLabel: 'x', defaultValue: 0, widget: { type: 'Number', min: 0, step: 1 } },
    { name: 'y', displayLabel: 'y', defaultValue: 0, widget: { type: 'Number', min: 0, step: 1 } },
    { name: 'width', displayLabel: 'width', defaultValue: 100, widget: { type: 'Number', min: 1, step: 1 } },
    { name: 'height', displayLabel: 'height', defaultValue: 100, widget: { type: 'Number', min: 1, step: 1 } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'crop' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      const iv = interval2D(`${inputs.x}`, `${inputs.y}`, `${inputs.width}`, `${inputs.height}`);
      return `${header()}${toJavaImage(inputs.image)}${iv}
res = ij.op().transform().crop(jimg, iv)
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};



export const ijTransformExtendBorderViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendBorderView',
  displayLabel: 'imagej_extend_border_view',
  description: 'Extend with border value view.',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().extendBorderView(jimg)
# Restrict extended view to original interval, zero-min, and materialize
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformExtendMirrorDoubleViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendMirrorDoubleView',
  displayLabel: 'imagej_extend_mirror_double_view',
  description: 'Extend with double mirror view.',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().extendMirrorDoubleView(jimg)
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformExtendMirrorSingleViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendMirrorSingleView',
  displayLabel: 'imagej_extend_mirror_single_view',
  description: 'Extend with single mirror view.',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().extendMirrorSingleView(jimg)
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformExtendPeriodicViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendPeriodicView',
  displayLabel: 'imagej_extend_periodic_view',
  description: 'Extend with periodic tiling view.',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().extendPeriodicView(jimg)
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformExtendRandomViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendRandomView',
  displayLabel: 'imagej_extend_random_view',
  description: 'Extend with random values view (seeded).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'min', displayLabel: 'min', defaultValue: 0.0, widget: { type: 'Number', step: 0.01 } },
    { name: 'max', displayLabel: 'max', defaultValue: 1.0, widget: { type: 'Number', step: 0.01 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().extendRandomView(jimg, float(${inputs.min}), float(${inputs.max}))
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformExtendValueViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendValueView',
  displayLabel: 'imagej_extend_value_view',
  description: 'Extend with a constant value view.',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'value', displayLabel: 'value (0-1)', defaultValue: 0.0, widget: { type: 'Number', min: 0, max: 1, step: 0.01 } }
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}from scyjava import jimport
FloatType = jimport('net.imglib2.type.numeric.real.FloatType')
val = FloatType(float(${inputs.value}))
res = ij.op().transform().extendValueView(jimg, val)
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformExtendViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendView',
  displayLabel: 'imagej_extend_view',
  description: 'Generic extend view (falls back to border extend).',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}try:
    res = ij.op().transform().extendView(jimg)
except Exception:
    res = ij.op().transform().extendBorderView(jimg)
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformExtendZeroViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_extendZeroView',
  displayLabel: 'imagej_extend_zero_view',
  description: 'Extend with zero value view.',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().extendZeroView(jimg)
res = ij.op().transform().intervalView(res, jimg)
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformFlatIterableViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_flatIterableView',
  displayLabel: 'imagej_flat_iterable_view',
  description: 'Flat iterable view over the image pixels.',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().flatIterableView(jimg)
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

export const ijTransformHyperSliceViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_hyperSliceView',
  displayLabel: 'imagej_hyper_slice_view',
  description: 'Extract a hyperslice at the given axis and position.',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'axis', displayLabel: 'axis', defaultValue: 0, widget: { type: 'Number', min: 0, step: 1 } },
    { name: 'position', displayLabel: 'position', defaultValue: 0, widget: { type: 'Number', min: 0, step: 1 } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'slice' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().hyperSliceView(jimg, int(${inputs.axis}), int(${inputs.position}))
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

export const ijTransformIntervalViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_intervalView',
  displayLabel: 'imagej_interval_view',
  description: 'Interval view (2D) from x, y, width, height.',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'x', displayLabel: 'x', defaultValue: 0, widget: { type: 'Number', min: 0, step: 1 } },
    { name: 'y', displayLabel: 'y', defaultValue: 0, widget: { type: 'Number', min: 0, step: 1 } },
    { name: 'width', displayLabel: 'width', defaultValue: 100, widget: { type: 'Number', min: 1, step: 1 } },
    { name: 'height', displayLabel: 'height', defaultValue: 100, widget: { type: 'Number', min: 1, step: 1 } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      const iv = interval2D(`${inputs.x}`, `${inputs.y}`, `${inputs.width}`, `${inputs.height}`);
      return `${header()}${toJavaImage(inputs.image)}${iv}
res = ij.op().transform().intervalView(jimg, iv)
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

export const ijTransformInvertAxisViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_invertAxisView',
  displayLabel: 'imagej_invert_axis_view',
  description: 'Invert a given axis (reverse order).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'axis', displayLabel: 'axis', defaultValue: 0, widget: { type: 'Dropdown', options: [0, 1] } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().invertAxisView(jimg, int(${inputs.axis}))
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};




export const ijTransformProjectNodeSpec: computeNodeSpec = {
  name: 'ij_transform_project',
  displayLabel: 'imagej_project',
  description: 'Project along an axis using ImageJ ops (max reducer).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'axis', displayLabel: 'axis', defaultValue: 0, widget: { type: 'Dropdown', options: [0, 1] } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'projection' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}from scyjava import jimport
ArrayImgs = jimport('net.imglib2.img.array.ArrayImgs')
FloatType = jimport('net.imglib2.type.numeric.real.FloatType')
Views = jimport('net.imglib2.view.Views')

n = int(jimg.numDimensions())
axis = max(0, min(n - 1, int(${inputs.axis})))
if n == 0:
    out_img = jimg
elif n == 1:
    out_img = ArrayImgs.floats(1)
    sample = Views.iterable(jimg)
    reducer = ij.op().op('stats.max', FloatType(), sample)
    ij.op().transform().project(out_img, jimg, reducer, 0)
else:
    dims = [int(jimg.dimension(d)) for d in range(n) if d != axis]
    if len(dims) == 0:
        dims = [1]
    out_img = ArrayImgs.floats(*dims)
    sample = Views.iterable(jimg)
    reducer = ij.op().op('stats.max', FloatType(), sample)
    ij.op().transform().project(out_img, jimg, reducer, axis)
${fromJavaToIM('out_img', outputs.image)}`;
    }
  }
};

export const ijTransformRotateViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_rotateView',
  displayLabel: 'imagej_rotate_view',
  description: 'Rotate by 90° increments using ops.transform.rotateView on axes (0,1).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'times90', displayLabel: 'times 90°', defaultValue: 1, widget: { type: 'Number', min: 0, step: 1 } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'rotated' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}
times = int(${inputs.times90}) % 4
res = jimg
if times > 0:
    for _ in range(times):
        res = ij.op().transform().rotateView(res, 0, 1)
# Materialize before conversion
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformScaleViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_scaleView',
  displayLabel: 'imagej_scale_view',
  description: 'Scale view by factors (2D).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'sx', displayLabel: 'scale x', defaultValue: 1.0, widget: { type: 'Number', min: 0.01, step: 0.01 } },
    { name: 'sy', displayLabel: 'scale y', defaultValue: 1.0, widget: { type: 'Number', min: 0.01, step: 0.01 } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'scaled' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}from scyjava import jimport
NLinear = jimport('net.imglib2.interpolation.randomaccess.NLinearInterpolatorFactory')

# Build scales array for all dimensions
n = int(jimg.numDimensions())
scales = [1.0 for _ in range(n)]
if n >= 1:
    scales[0] = float(${inputs.sx})
if n >= 2:
    scales[1] = float(${inputs.sy})

res = ij.op().transform().scaleView(jimg, scales, NLinear())
# Materialize before conversion to avoid view conversion issues
res = ij.op().transform().zeroMinView(res)
out = ij.op().run('copy.rai', res)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};

export const ijTransformShearViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_shearView',
  displayLabel: 'imagej_shear_view',
  description: 'Shear view along an axis by a factor.',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'axis', displayLabel: 'axis', defaultValue: 0, widget: { type: 'Dropdown', options: [0, 1] } },
    { name: 'shear', displayLabel: 'shear', defaultValue: 0.0, widget: { type: 'Dropdown', options: [0, 1] } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'sheared' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}from scyjava import jimport
Views = jimport('net.imglib2.view.Views')
axis = int(${inputs.axis})
shift = int(round(float(${inputs.shear})))
ext = Views.extendZero(jimg)
view = ij.op().transform().shearView(ext, axis, shift)
bounded = ij.op().transform().intervalView(view, jimg)
bounded = ij.op().transform().zeroMinView(bounded)
out = ij.op().run('copy.rai', bounded)
${fromJavaToIM('out', outputs.image)}`;
    }
  }
};


export const ijTransformSubsampleViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_subsampleView',
  displayLabel: 'imagej_subsample_view',
  description: 'Subsample view with given step sizes (2D).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'step_x', displayLabel: 'step x', defaultValue: 2, widget: { type: 'Number', min: 1, step: 1 } },
    { name: 'step_y', displayLabel: 'step y', defaultValue: 2, widget: { type: 'Number', min: 1, step: 1 } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'subsampled' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().subsampleView(jimg, int(${inputs.step_x}), int(${inputs.step_y}))
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};

export const ijTransformTranslateViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_translateView',
  displayLabel: 'imagej_translate_view',
  description: 'Translate view by dx, dy (2D).',
  category: 'imagej transform',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'dx', displayLabel: 'dx', defaultValue: 0, widget: { type: 'Number', step: 1 } },
    { name: 'dy', displayLabel: 'dy', defaultValue: 0, widget: { type: 'Number', step: 1 } },
  ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'translated' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().translateView(jimg, int(${inputs.dx}), int(${inputs.dy}))
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};


export const ijTransformZeroMinViewNodeSpec: computeNodeSpec = {
  name: 'ij_transform_zeroMinView',
  displayLabel: 'imagej_zero_min_view',
  description: 'Shift the min coordinate of the interval to zero.',
  category: 'imagej transform',
  inputs: [ { name: 'image', type: 'image', displayLabel: 'image' } ],
  outputs: [ { name: 'image', type: 'image', displayLabel: 'view' } ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `${header()}${toJavaImage(inputs.image)}res = ij.op().transform().zeroMinView(jimg)
${fromJavaToIM('res', outputs.image)}`;
    }
  }
};


