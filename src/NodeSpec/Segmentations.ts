import { computeNodeSpec } from '../ReactVP';

export const watershedNodeSpec: computeNodeSpec = {
  name: 'watershed',
  displayLabel: 'segmentation',
  description: 'Applies watershed segmentation to the input image.',
  category: 'segmentation',
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
  description:
    'Extract properties from segments of an image after applying segmentation algorithms.',
  category: 'segmentation',
  inputs: [
    {
      name: 'segments',
      type: 'segments',
      displayLabel: 'segments',
      description:
        'The segments of the image after applying segmentation algorithms.'
    },
    {
      name: 'spacing',
      type: 'number',
      displayLabel: 'spacing',
      description:
        'The pixel spacing along each axis of the image. Default is 1.0.',
      defaultValue: [1.0, 1.0],
      widget: {
        type: 'Tuple2'
      }
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
${outputs.summary} = measure.regionprops_table(${inputs.segments}, spacing=${inputs.spacing}, properties=['label', 'centroid', 'area', 'num_pixels'])
data = pd.DataFrame(${outputs.summary})
total_labels = len(data['label'])
average_area = data['area'].mean()
average_num_pixels = data['num_pixels'].mean()
print(f"Number of segments: {total_labels}")
print(f"Average segments physical area: {average_area}")
print(f"Average segments pixels size: {average_num_pixels}")

data['Position(x, y)'] = list(zip(data['centroid-1'], data['centroid-0']))
data = data.drop(columns=['centroid-0', 'centroid-1'])
${outputs.summary} = data.rename(columns={
    'label': 'Index',
    'area': 'Physical Area',
    'num_pixels': 'Pixel Count'
})`;
    }
  }
};
