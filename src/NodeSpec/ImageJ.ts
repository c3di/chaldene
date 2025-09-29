import { type computeNodeSpec } from '../ReactVP';

export const imageJAnalyzeParticlesNodeSpec: computeNodeSpec = {
  name: 'analyze_particles',
  displayLabel: 'imagej_analyze_particles',
  description:
    'Run ImageJ Analyze Particles on a binary image and return measurements.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Binary input image.'
    },
    {
      name: 'min_size',
      displayLabel: 'min size (pixels^2)',
      description: 'Minimum particle size in pixels.',
      defaultValue: 0,
      widget: { type: 'Number', min: 0, step: 1 }
    },
    {
      name: 'max_size',
      displayLabel: 'max size (pixels^2)',
      description: 'Maximum particle size in pixels.',
      defaultValue: 1e12,
      widget: { type: 'Number', min: 0, step: 1 }
    },
    {
      name: 'min_circularity',
      displayLabel: 'min circularity',
      description: 'Minimum circularity (0.0 - 1.0).',
      defaultValue: 0.0,
      widget: { type: 'Number', min: 0, max: 1, step: 0.01 }
    },
    {
      name: 'max_circularity',
      displayLabel: 'max circularity',
      description: 'Maximum circularity (0.0 - 1.0).',
      defaultValue: 1.0,
      widget: { type: 'Number', min: 0, max: 1, step: 0.01 }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image with overlay',
      description: 'Input image flattened with particle overlay.'
    },
    {
      name: 'results',
      type: 'dataframe',
      displayLabel: 'measurements',
      description: 'Particle measurements as a DataFrame.'
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, string>, outputs: Record<string, string>) => {
      return `import imagej
from im2im import Image as IM, im2im
import pandas as pd
from scyjava import jimport

# Ensure a single ImageJ gateway with legacy active (IJ1) per session
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji', add_legacy=True)

# Ensure binary image as 0/1 float
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
binary = ((in_im.raw_image > 0.5).astype('uint8') * 255)

# Convert to ImagePlus (original ImageJ)
imp = ij.py.to_imageplus(binary)

# Set measurements (as in tutorial)
ij.IJ.run('Set Measurements...', "area mean min centroid perimeter bounding fit shape display redirect=None decimal=3")

# Clear previous results and ensure threshold is set on the binary image
ij.IJ.run('Clear Results')
ij.IJ.setThreshold(imp, 255, 255)

# Build Analyze Particles options using node inputs
size_min = float(${inputs.min_size})
size_max = float(${inputs.max_size})
circ_min = float(${inputs.min_circularity})
circ_max = float(${inputs.max_circularity})
size_max_str = 'Infinity' if size_max <= 0 or size_max > 1e9 else str(int(size_max))
opts = f"size={int(size_min)}-{size_max_str} circularity={circ_min:.2f}-{circ_max:.2f} show=Overlay display clear"

# Run Analyze Particles with explicit size and circularity constraints
ij.IJ.run(imp, 'Analyze Particles...', opts)

# Retrieve ResultsTable (singleton) and convert to pandas with string-safe access
ResultsTable = jimport('ij.measure.ResultsTable')
rt = ResultsTable.getResultsTable()
headings = list(rt.getHeadings()) if rt and rt.getHeadings() is not None else []
rows = rt.size() if rt else 0
data = {}
for h in headings:
    col = []
    for r in range(rows):
        try:
            # Prefer string value when present (e.g., Label)
            sval = rt.getStringValue(h, r)
            if sval is not None and sval != '':
                col.append(sval)
            else:
                col.append(rt.getValue(h, r))
        except Exception:
            try:
                col.append(rt.getValue(h, r))
            except Exception:
                col.append(None)
    data[h] = col
${outputs.results} = pd.DataFrame(data)

# Flatten overlay to pixels and output as image
ij.IJ.run(imp, 'Flatten', '')
WindowManager = jimport('ij.WindowManager')
flat = WindowManager.getCurrentImage()
if flat is None:
    flat = imp
flat_xr = ij.py.from_java(flat)
if flat_xr is None:
    flat_xr = ij.py.from_java(imp)
import numpy as np
flat_np = np.asarray(flat_xr)
${outputs.image} = IM(flat_np.astype('uint8'), 'numpy.rgb_uint8')`;
    }
  }
};


export const imageJDetectRidgesNodeSpec: computeNodeSpec = {
  name: 'imagej_detect_ridges',
  displayLabel: 'imagej_detect_ridges',
  description: 'Detect ridges using ImageJ2 segmentation ops with overlay.',
  category: 'imagej',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'sigma', displayLabel: 'sigma', defaultValue: 1.0, widget: { type: 'Number', min: 0.01, step: 0.01 } },
    { name: 'threshold', displayLabel: 'ridge threshold', defaultValue: 0.5, widget: { type: 'Number', min: 0, max: 1, step: 0.01 } }
  ],
  outputs: [
    { name: 'image', type: 'image', displayLabel: 'image with ridge overlay' },
    { name: 'results', type: 'dataframe', displayLabel: 'ridge measurements' }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np
import pandas as pd
from scyjava import jimport

# Initialize (reuse if already present) with legacy for IJ1 Flatten
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji', add_legacy=True)

# Convert to Java Float32
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)
jimg = ij.op().run('convert.float32', jimg)

sigma = float(${inputs.sigma})
threshold = float(${inputs.threshold})

# Detect ridges
res = None
try:
    res = ij.op().run('segment.detectRidges', jimg, sigma)
except Exception:
    try:
        out = ij.op().run('create.img', jimg)
        res = ij.op().run('segment.detectRidges', out, jimg, sigma)
    except Exception:
        res = jimg

# Convert ridge response to binary mask for analysis
ridge_xr = ij.py.from_java(res)
ridge_np = getattr(ridge_xr, 'values', ridge_xr)
ridge_arr = np.asarray(ridge_np)

# Normalize and threshold
if np.issubdtype(ridge_arr.dtype, np.floating):
    vmin = float(ridge_arr.min()) if ridge_arr.size else 0.0
    vmax = float(ridge_arr.max()) if ridge_arr.size else 1.0
    if vmax > vmin:
        ridge_norm = (ridge_arr - vmin) / (vmax - vmin)
    else:
        ridge_norm = np.zeros_like(ridge_arr, dtype='float64')
else:
    ridge_arr = ridge_arr.astype('float64', copy=False)
    vmax = float(ridge_arr.max()) if ridge_arr.size else 1.0
    ridge_norm = (ridge_arr / vmax) if vmax > 0 else np.zeros_like(ridge_arr)

# Threshold to get binary ridge mask
ridge_binary = (ridge_norm > threshold).astype('uint8') * 255

# Convert original image to ImagePlus for overlay
orig_8bit = (in_im.raw_image * 255).astype('uint8')
imp = ij.py.to_imageplus(orig_8bit)

# Convert binary ridge mask to ImagePlus and analyze
ridge_imp = ij.py.to_imageplus(ridge_binary)
ij.IJ.setThreshold(ridge_imp, 255, 255)

# Set measurements and clear results
ij.IJ.run('Set Measurements...', "area mean centroid bounding shape display redirect=None decimal=3")
ij.IJ.run('Clear Results')

# Analyze ridge particles (connected components)
ij.IJ.run(ridge_imp, 'Analyze Particles...', "size=1-Infinity show=Overlay display clear")

# Copy overlay from ridge analysis to original image
ridge_overlay = ridge_imp.getOverlay()
if ridge_overlay is not None:
    imp.setOverlay(ridge_overlay)

# Get results
ResultsTable = jimport('ij.measure.ResultsTable')
rt = ResultsTable.getResultsTable()
headings = list(rt.getHeadings()) if rt and rt.getHeadings() is not None else []
rows = rt.size() if rt else 0
data = {}

if rows > 0:
    for h in headings:
        col = []
        for r in range(rows):
            try:
                sval = rt.getStringValue(h, r)
                if sval is not None and sval != '':
                    col.append(sval)
                else:
                    col.append(rt.getValue(h, r))
            except Exception:
                try:
                    col.append(rt.getValue(h, r))
                except Exception:
                    col.append(None)
        data[h] = col
    # Add ridge count as a column with same length
    data['Ridge_Count'] = [rows] * rows
else:
    # No ridges detected - create summary DataFrame
    data = {'Ridge_Count': [0]}

${outputs.results} = pd.DataFrame(data)

# Flatten overlay to pixels and output as image
ij.IJ.run(imp, 'Flatten', '')
WindowManager = jimport('ij.WindowManager')
flat = WindowManager.getCurrentImage()
if flat is None:
    flat = imp
flat_xr = ij.py.from_java(flat)
if flat_xr is None:
    flat_xr = ij.py.from_java(imp)
flat_np = np.asarray(flat_xr)
${outputs.image} = IM(flat_np.astype('uint8'), 'numpy.rgb_uint8')`;
    }
  }
};

export const imageJDetectJunctionsNodeSpec: computeNodeSpec = {
  name: 'imagej_detect_junctions',
  displayLabel: 'imagej_detect_junctions',
  description: 'Detect junctions using ImageJ2 segmentation ops with overlay.',
  category: 'imagej',
  inputs: [
    { name: 'image', type: 'image', displayLabel: 'image' },
    { name: 'sigma', displayLabel: 'sigma', defaultValue: 1.0, widget: { type: 'Number', min: 0.01, step: 0.01 } },
    { name: 'threshold', displayLabel: 'junction threshold', defaultValue: 0.5, widget: { type: 'Number', min: 0, max: 1, step: 0.01 } }
  ],
  outputs: [
    { name: 'image', type: 'image', displayLabel: 'image with junction overlay' },
    { name: 'results', type: 'dataframe', displayLabel: 'junction measurements' }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np
import pandas as pd
from scyjava import jimport

# Initialize (reuse if already present) with legacy for IJ1 Flatten
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji', add_legacy=True)

# Convert to Java Float32
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)
jimg = ij.op().run('convert.float32', jimg)

sigma = float(${inputs.sigma})
threshold = float(${inputs.threshold})

# Detect junctions
res = None
try:
    res = ij.op().run('segment.detectJunctions', jimg, sigma)
except Exception:
    try:
        out = ij.op().run('create.img', jimg)
        res = ij.op().run('segment.detectJunctions', out, jimg, sigma)
    except Exception:
        res = jimg

# Convert junction response to binary mask for analysis
junction_xr = ij.py.from_java(res)
junction_np = getattr(junction_xr, 'values', junction_xr)
junction_arr = np.asarray(junction_np)

# Normalize and threshold
if np.issubdtype(junction_arr.dtype, np.floating):
    vmin = float(junction_arr.min()) if junction_arr.size else 0.0
    vmax = float(junction_arr.max()) if junction_arr.size else 1.0
    if vmax > vmin:
        junction_norm = (junction_arr - vmin) / (vmax - vmin)
    else:
        junction_norm = np.zeros_like(junction_arr, dtype='float64')
else:
    junction_arr = junction_arr.astype('float64', copy=False)
    vmax = float(junction_arr.max()) if junction_arr.size else 1.0
    junction_norm = (junction_arr / vmax) if vmax > 0 else np.zeros_like(junction_arr)

# Threshold to get binary junction mask
junction_binary = (junction_norm > threshold).astype('uint8') * 255

# Convert original image to ImagePlus for overlay
orig_8bit = (in_im.raw_image * 255).astype('uint8')
imp = ij.py.to_imageplus(orig_8bit)

# Convert binary junction mask to ImagePlus and analyze
junction_imp = ij.py.to_imageplus(junction_binary)
ij.IJ.setThreshold(junction_imp, 255, 255)

# Set measurements and clear results
ij.IJ.run('Set Measurements...', "area mean centroid bounding shape display redirect=None decimal=3")
ij.IJ.run('Clear Results')

# Analyze junction particles (connected components)
ij.IJ.run(junction_imp, 'Analyze Particles...', "size=1-Infinity show=Overlay display clear")

# Copy overlay from junction analysis to original image
junction_overlay = junction_imp.getOverlay()
if junction_overlay is not None:
    imp.setOverlay(junction_overlay)

# Get results
ResultsTable = jimport('ij.measure.ResultsTable')
rt = ResultsTable.getResultsTable()
headings = list(rt.getHeadings()) if rt and rt.getHeadings() is not None else []
rows = rt.size() if rt else 0
data = {}

if rows > 0:
    for h in headings:
        col = []
        for r in range(rows):
            try:
                sval = rt.getStringValue(h, r)
                if sval is not None and sval != '':
                    col.append(sval)
                else:
                    col.append(rt.getValue(h, r))
            except Exception:
                try:
                    col.append(rt.getValue(h, r))
                except Exception:
                    col.append(None)
        data[h] = col
    # Add junction count as a column with same length
    data['Junction_Count'] = [rows] * rows
else:
    # No junctions detected - create summary DataFrame
    data = {'Junction_Count': [0]}

${outputs.results} = pd.DataFrame(data)

# Flatten overlay to pixels and output as image
ij.IJ.run(imp, 'Flatten', '')
WindowManager = jimport('ij.WindowManager')
flat = WindowManager.getCurrentImage()
if flat is None:
    flat = imp
flat_xr = ij.py.from_java(flat)
if flat_xr is None:
    flat_xr = ij.py.from_java(imp)
flat_np = np.asarray(flat_xr)
${outputs.image} = IM(flat_np.astype('uint8'), 'numpy.rgb_uint8')`;
    }
  }
};

