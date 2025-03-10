import { computeNodeSpec } from '../ReactVP';

export const watershedNodeSpec: computeNodeSpec = {
  name: 'watershed',
  displayLabel: 'watershed segmentation',
  description:
    'Separating overlapping or touching objects in an image into distinct regions or segments.',
  category: 'segmentation',
  inputs: [
    {
      name: 'image',
      type: ['binary image', 'image'],
      displayLabel: 'image (binary, gray, rgb)',
      description:
        'The interesting objects are assumed to be brighter than the background.'
    },
    {
      name: 'underlay_image',
      type: ['image'],
      displayLabel: 'underlay image (shape as image)',
      description:
        'Image used as underlay for segments. It should have the same shape as image (first parameter), optionally with an additional RGB (channels) axis. If is an RGB image, it is converted to grayscale.',
      defaultValue: 'None'
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
      description: 'The segmentes produced by watershed algorithm.'
    },
    {
      name: 'vis',
      type: 'image',
      description: 'The visualization of segmentes.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import segmentation, filters
from scipy import ndimage as ndi
from skimage.color import label2rgb
in_im = im2im(${inputs.image}, 'numpy.gray_float64(0to1)')
if in_im.raw_image.ndim == 2:
    region_of_interest = in_im.raw_image >=0.9
elif in_im.raw_image.ndim ==3 and in_im.raw_image.shape[2] ==3:
    region_of_insterest = np.all(in_im.raw_image >=0.9, axis=-1)
gradient = filters.sobel(in_im.raw_image)
markers = ndi.label(gradient < ${inputs.granularity})[0]
${outputs.segments} = segmentation.watershed(gradient, markers=markers, mask=region_of_interest)
if ${inputs.underlay_image} is not None:
    underlay_im = ${inputs.underlay_image}.raw_image
else:
    underlay_im = None
${outputs.vis} = IM(label2rgb(${outputs.segments}, bg_label=0, image=underlay_im), {**in_im.metadata, 'color_channel': 'rgb', 'channel_order': 'channel last'})`;
    }
  }
};

export const regionpropsNodeSpec: computeNodeSpec = {
  name: 'regionprops',
  displayLabel: 'summary',
  description:
    'Extract properties (index, pixel count, position) of each segments after applying segmentation algorithms.',
  category: 'segmentation',
  inputs: [
    {
      name: 'segments',
      type: 'segments',
      displayLabel: 'segments',
      description:
        'The segments of the image after applying segmentation algorithms.'
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
${outputs.summary} = measure.regionprops_table(${inputs.segments}, properties=['label', 'centroid', 'num_pixels'])
data = pd.DataFrame(${outputs.summary})
total_labels = len(data['label'])
average_num_pixels = data['num_pixels'].mean()
print(f"Number of segments: {total_labels}")
print(f"Average segments pixels size: {average_num_pixels}")

data['Position(x, y)'] = list(zip(data['centroid-1'], data['centroid-0']))
data = data.drop(columns=['centroid-0', 'centroid-1'])
${outputs.summary} = data.rename(columns={
    'label': 'Index',
    'num_pixels': 'Pixel Count'
})`;
    }
  }
};

export const segmentesSizeNodeSpec: computeNodeSpec = {
  name: 'regionsize',
  displayLabel: 'segmentes size',
  description:
    'Extract size of each segments after applying segmentation algorithms.',
  category: 'segmentation',
  inputs: [
    {
      name: 'segments',
      type: 'segments',
      displayLabel: 'segments',
      description:
        'The segments of the image after applying segmentation algorithms.'
    }
  ],
  outputs: [
    {
      name: 'sizes',
      type: 'list',
      displayLabel: 'sizes',
      description: 'The size of each segments.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import measure
${outputs.sizes} = measure.regionprops_table(${inputs.segments}, properties=['area'])['area']
`;
    }
  }
};
