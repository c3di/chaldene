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
      defaultValue: 500,
      widget: { type: 'Number', min: 0, step: 1 }
    },
    {
      name: 'min_circularity',
      displayLabel: 'min circularity',
      description: 'Minimum circularity (0.0 - 1.0).',
      defaultValue: 0.42,
      widget: { type: 'Number', min: 0, max: 1, step: 0.01 }
    },
    {
      name: 'max_circularity',
      displayLabel: 'max circularity',
      description: 'Maximum circularity (0.0 - 1.0).',
      defaultValue: 0.61,
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
opts = f"size={int(size_min)}-{size_max_str} circularity={circ_min:.2f}-{circ_max:.2f} show=Overlay clear"

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
                col.append(str(sval))
            else:
                col.append(float(rt.getValue(h, r)))
        except Exception:
            try:
                col.append(float(rt.getValue(h, r)))
            except Exception:
                col.append(None)
    data[str(h)] = col
${outputs.results} = pd.DataFrame(data)
display(${outputs.results})

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

export const imageJAsciiNodeSpec: computeNodeSpec = {
  name: 'imagej_ascii',
  displayLabel: 'imagej_ascii',
  description: 'Convert image to ASCII art representation.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image to convert to ASCII.'
    },
    {
      name: 'chars',
      displayLabel: 'character set',
      description: 'Character set for ASCII representation.',
      defaultValue: ' .:-=+*#%@',
      widget: { type: 'String' }
    }
  ],
  outputs: [
    {
      name: 'ascii_text',
      type: 'String',
      displayLabel: 'ASCII text',
      description: 'ASCII art representation of the image.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')
# Convert image to grayscale
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

chars = "${inputs.chars}"

# Use the correct ImageJ ASCII operation with proper parameters
ascii_result = ij.op().run('net.imagej.ops.image.ascii.DefaultASCII', jimg)
${outputs.ascii_text} = str(ascii_result)
`;
    }
  }
};

export const imageJCooccurrenceMatrixNodeSpec: computeNodeSpec = {
  name: 'imagej_cooccurrence_matrix',
  displayLabel: 'imagej_cooccurrence_matrix',
  description: 'Calculate gray-level co-occurrence matrix for texture analysis.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input grayscale image.'
    },
    {
      name: 'distance',
      displayLabel: 'distance',
      description: 'Distance between pixels.',
      defaultValue: 1,
      widget: { type: 'Number', min: 1, step: 1 }
    },
    {
      name: 'angle',
      displayLabel: 'angle (degrees)',
      description: 'Angle for pixel pairs (0, 45, 90, 135).',
      defaultValue: 0,
      widget: { type: 'Number', min: 0, max: 180, step: 45 }
    },
    {
      name: 'gray_levels',
      displayLabel: 'gray levels',
      description: 'Number of gray levels to use.',
      defaultValue: 256,
      widget: { type: 'Number', min: 2, max: 256, step: 1 }
    }
  ],
  outputs: [
    {
      name: 'matrix',
      type: 'dataframe',
      displayLabel: 'co-occurrence matrix',
      description: 'Gray-level co-occurrence matrix.'
    },
    {
      name: 'features',
      type: 'dataframe',
      displayLabel: 'texture features',
      description: 'Extracted texture features (contrast, correlation, energy, homogeneity).'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np
import pandas as pd

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Convert image to grayscale
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

distance = int(${inputs.distance})
angle = float(${inputs.angle})
gray_levels = int(${inputs.gray_levels})

# Use ImageJ co-occurrence matrix operation
matrix_result = ij.op().run('image.cooccurrenceMatrix', jimg, distance, angle, gray_levels)
matrix_array = np.asarray(ij.py.from_java(matrix_result))
    
# Convert to DataFrame
${outputs.matrix} = pd.DataFrame(matrix_array)
    
# Calculate texture features
matrix_norm = matrix_array / np.sum(matrix_array) if np.sum(matrix_array) > 0 else matrix_array
    
# Feature calculations
i, j = np.meshgrid(range(gray_levels), range(gray_levels), indexing='ij')
    
contrast = np.sum(matrix_norm * (i - j) ** 2)
correlation = np.sum(matrix_norm * i * j) - np.sum(matrix_norm * i) * np.sum(matrix_norm * j)
energy = np.sum(matrix_norm ** 2)
homogeneity = np.sum(matrix_norm / (1 + np.abs(i - j)))
    
features_dict = {
  'feature': ['contrast', 'correlation', 'energy', 'homogeneity'],
  'value': [contrast, correlation, energy, homogeneity]
}
${outputs.features} = pd.DataFrame(features_dict)
`;
    }
  }
};

export const imageJDistanceTransformNodeSpec: computeNodeSpec = {
  name: 'imagej_distance_transform',
  displayLabel: 'imagej_distance_transform',
  description: 'Calculate distance transform of binary image.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'binary image',
      displayLabel: 'binary image',
      description: 'Input binary image.'
    },
    {
      name: 'metric',
      displayLabel: 'distance metric',
      description: 'Distance metric to use.',
      defaultValue: 'euclidean',
      widget: { 
        type: 'Dropdown', 
        options: ['euclidean', 'manhattan', 'chessboard'] 
      }
    }
  ],
  outputs: [
    {
      name: 'distance_map',
      type: 'image',
      displayLabel: 'distance map',
      description: 'Distance transform result.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Convert binary image to standard format
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

metric = "${inputs.metric}"

# Use ImageJ distance transform operation
if metric == 'euclidean':
  result = ij.op().run('image.distancetransform', jimg)
else:
# For other metrics, may need to use different operation names
  result = ij.op().run('image.distancetransform', jimg)
    
result_array = np.asarray(ij.py.from_java(result))

# Normalize distance values to [0,1] range for display
if result_array.max() > result_array.min():
    distance_normalized = (result_array - result_array.min()) / (result_array.max() - result_array.min())
else:
    distance_normalized = np.zeros_like(result_array, dtype=np.float64)

${outputs.distance_map} = IM(distance_normalized, 'numpy.gray_float64(0to1)')
`;
    }
  }
};

export const imageJEquationNodeSpec: computeNodeSpec = {
  name: 'imagej_equation',
  displayLabel: 'imagej_equation',
  description: 'Apply mathematical equation to image pixels.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'equation',
      displayLabel: 'equation',
      description: 'Mathematical equation (use "v" for pixel value).',
      defaultValue: 'v * 2',
      widget: { type: 'String' }
    }
  ],
  outputs: [
    {
      name: 'result',
      type: 'image',
      displayLabel: 'result image',
      description: 'Image after applying equation.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Convert image
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

equation = "${inputs.equation}"

result = ij.op().run('image.equation', jimg, equation)
result_array = np.asarray(ij.py.from_java(result))

# Ensure result is in proper range for display - equations can produce any values
result_clipped = np.clip(result_array, 0, 1)
${outputs.result} = IM(result_clipped.astype(np.float64), 'numpy.gray_float64(0to1)')
`;
    }
  }
};

export const imageJFillNodeSpec: computeNodeSpec = {
  name: 'imagej_fill',
  displayLabel: 'imagej_fill',
  description: 'Fill image with a constant value.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image (defines dimensions).'
    },
    {
      name: 'value',
      displayLabel: 'fill value',
      description: 'Value to fill the image with.',
      defaultValue: 0.0,
      widget: { type: 'Number', min: 0, max: 1, step: 0.01 }
    }
  ],
  outputs: [
    {
      name: 'filled_image',
      type: 'image',
      displayLabel: 'filled image',
      description: 'Image filled with constant value.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Get image dimensions
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

fill_value = float(${inputs.value})

result = ij.op().run('image.fill', jimg, fill_value)
result_array = np.asarray(ij.py.from_java(result))

# Ensure fill value is in proper range for display
result_clipped = np.clip(result_array, 0, 1)
${outputs.filled_image} = IM(result_clipped.astype(np.float64), 'numpy.gray_float64(0to1)')
    `;
    }
  }
};

export const imageJHistogramNodeSpec: computeNodeSpec = {
  name: 'imagej_histogram',
  displayLabel: 'imagej_histogram',
  description: 'Calculate image histogram.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image.'
    },
    {
      name: 'bins',
      displayLabel: 'number of bins',
      description: 'Number of histogram bins.',
      defaultValue: 256,
      widget: { type: 'Number', min: 2, max: 1024, step: 1 }
    }
  ],
  outputs: [
    {
      name: 'histogram',
      type: 'dataframe',
      displayLabel: 'histogram',
      description: 'Histogram data with bin centers and counts.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np
import pandas as pd

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Convert image
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

num_bins = int(${inputs.bins})

    
hist_result = ij.op().run('image.histogram', jimg, num_bins)
    

if hasattr(hist_result, 'getHistogram'):
  hist_counts = np.array(hist_result.getHistogram())
else:
  hist_counts = np.asarray(ij.py.from_java(hist_result))
    

bin_edges = np.linspace(0, 1, num_bins + 1)
bin_centers = (bin_edges[:-1] + bin_edges[1:]) / 2
    
histogram_data = pd.DataFrame({
  'bin_center': bin_centers,
  'count': hist_counts[:len(bin_centers)]
})
${outputs.histogram} = histogram_data
    `;
    }
  }
};

export const imageJIntegralNodeSpec: computeNodeSpec = {
  name: 'imagej_integral',
  displayLabel: 'imagej_integral',
  description: 'Calculate integral image (summed area table).',
  category: 'imagej',
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
      name: 'integral_image',
      type: 'image',
      displayLabel: 'integral image',
      description: 'Integral image result.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Convert image
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

result = ij.op().run('image.integral', jimg)
result_array = np.asarray(ij.py.from_java(result))
    
result_min = result_array.min()
result_max = result_array.max()
if result_max > result_min:
  result_normalized = (result_array - result_min) / (result_max - result_min)
else:
  result_normalized = np.zeros_like(result_array)
    
${outputs.integral_image} = IM(result_normalized.astype(np.float64), 'numpy.gray_float64(0to1)')
    `;
    }
  }
};

export const imageJInvertNodeSpec: computeNodeSpec = {
  name: 'imagej_invert',
  displayLabel: 'imagej_invert',
  description: 'Invert image pixel values.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image to invert.'
    }
  ],
  outputs: [
    {
      name: 'inverted_image',
      type: 'image',
      displayLabel: 'inverted image',
      description: 'Inverted image.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Convert image
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

try:
    # Use ImageJ invert operation
    result = ij.op().run('image.invert', jimg)
    result_array = np.asarray(ij.py.from_java(result))
    ${outputs.inverted_image} = IM(result_array, 'numpy.gray_float64')
    
except Exception as e:
    # Fallback implementation
    img_array = np.asarray(in_im.raw_image)
    
    # Invert by subtracting from maximum value
    if img_array.dtype == np.uint8:
        inverted = 255 - img_array
    else:
        # For float images, assume range [0, 1]
        inverted = 1.0 - img_array
    
    ${outputs.inverted_image} = IM(inverted.astype(np.float64), 'numpy.gray_float64(0to1)')`;
    }
  }
};

export const imageJWatershedNodeSpec: computeNodeSpec = {
  name: 'imagej_watershed',
  displayLabel: 'imagej_watershed',
  description: 'Apply watershed segmentation to image.',
  category: 'imagej',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'Input image for watershed segmentation.'
    },
    {
      name: 'use_eight_connectivity',
      displayLabel: 'use eight connectivity',
      description: 'Whether to use eight-connectivity (vs four-connectivity).',
      defaultValue: true,
      widget: { type: 'Boolean' }
    },
    {
      name: 'draw_watersheds',
      displayLabel: 'draw watersheds',
      description: 'Whether to draw watershed boundaries.',
      defaultValue: true,
      widget: { type: 'Boolean' }
    }
  ],
  outputs: [
    {
      name: 'segmented_image',
      type: 'image',
      displayLabel: 'segmented image',
      description: 'Watershed segmentation result with boundaries.'
    },
    {
      name: 'labels',
      type: 'image',
      displayLabel: 'labels',
      description: 'Label image with segmented regions.'
    }
  ],
  codeGenerators: {
    Python: (inputs, outputs) => {
      return `import imagej
from im2im import Image as IM, im2im
import numpy as np

# Initialize ImageJ
try:
    ij
except NameError:
    ij = imagej.init('sc.fiji:fiji')

# Convert image
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
jimg = ij.py.to_java(in_im.raw_image)

use_eight_connectivity = bool(${inputs.use_eight_connectivity})
draw_watersheds = bool(${inputs.draw_watersheds})

# ImageJ watershed returns ImgLabeling - need to extract the index image
labeling_result = ij.op().run('image.watershed', jimg, use_eight_connectivity, draw_watersheds)

# Extract the index image from the labeling
index_img = labeling_result.getIndexImg()
labels = np.asarray(ij.py.from_java(index_img))
    
# Create colored segmentation for visualization
from skimage.segmentation import mark_boundaries
original = np.asarray(in_im.raw_image)
if len(original.shape) == 2:
  rgb_original = np.stack([original, original, original], axis=-1)
else:
  rgb_original = original
    
segmented_vis = mark_boundaries(rgb_original, labels, mode='thick')
    
# Ensure RGB image has proper format - convert to grayscale if needed since boundaries are often grayscale
if len(segmented_vis.shape) == 3 and segmented_vis.shape[2] == 3:
    # Convert RGB to grayscale for consistent handling
    segmented_gray = np.mean(segmented_vis, axis=2)
    ${outputs.segmented_image} = IM(segmented_gray.astype(np.float64), 'numpy.gray_float64(0to1)')
else:
    ${outputs.segmented_image} = IM(segmented_vis.astype(np.float64), 'numpy.gray_float64(0to1)')

# Output labels image
# Normalize labels to [0,1] range for display
if labels.max() > labels.min():
    labels_normalized = (labels - labels.min()) / (labels.max() - labels.min())
else:
    labels_normalized = np.zeros_like(labels, dtype=np.float64)

${outputs.labels} = IM(labels_normalized, 'numpy.gray_float64(0to1)')
    `;
    }
  }
};

