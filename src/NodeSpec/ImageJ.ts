import { type computeNodeSpec } from '../ReactVP';

// ImageJ auto threshold via PyImageJ
export const imageJAutoThresholdNodeSpec: computeNodeSpec = {
  name: 'auto_threshold',
  displayLabel: 'imagej_auto_threshold',
  description:
    'Apply ImageJ Auto Threshold (legacy methods) and return a binary image.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'method',
      displayLabel: 'method',
      description:
        'Auto Threshold method name (e.g., Otsu, Isodata, Triangle, Yen, Huang, etc.).',
      defaultValue: 'Otsu',
      widget: {
        type: 'Dropdown',
        options: ['Otsu', 'IsoData', 'Triangle', 'Yen', 'Huang'],
        placeholder: 'Otsu'
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'The thresholded binary image.'
    }
  ],
  codeGenerators: {
    Python: (inputs: Record<string, string>, outputs: Record<string, string>) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Ensure a single ImageJ gateway with legacy active (IJ1) per session
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji', add_legacy=True)

# Convert input to numpy grayscale [0,1]
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')

# ImageJ1 thresholding expects 8/16-bit. Convert to 8-bit.
arr8 = (in_im.raw_image * 255.0).round().clip(0, 255).astype('uint8')
imp = ij.py.to_imageplus(arr8)

# Threshold to binary mask using IJ1 API (works headless per docs)
from scyjava import jimport
Prefs = jimport('ij.Prefs')
Prefs.blackBackground = True
ij.IJ.setAutoThreshold(imp, f"${inputs.method} dark")
ImagePlus = jimport('ij.ImagePlus')
mask_ip = imp.createThresholdMask()
mask_imp = ImagePlus('mask', mask_ip)
# Optional cleanup similar to tutorial
ij.IJ.run(mask_imp, 'Close', '')

# Read back mask as numpy and scale to 0/1 float
mask_xr = ij.py.from_java(mask_imp)
binary = (mask_xr.values > 0).astype(float)
${outputs.image} = IM(binary, in_im.metadata)`;
    }
  }
};

// ImageJ Analyze Particles via PyImageJ
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


