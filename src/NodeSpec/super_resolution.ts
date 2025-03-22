/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { type computeNodeSpec } from '../ReactVP';

export const superResolutionNodeSpec: computeNodeSpec = {
  name: 'super resolution',
  displayLabel: 'super resolution',
  description:
    'Increase the resolution of the input image using super resolution techniques.',
  category: 'super resolution',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The input image to be super resolved.'
    },
    {
      name: 'scale',
      displayLabel: 'scale',
      description: 'The scaling factor for super resolution.',
      defaultValue: 2,
      widget: {
        type: 'Number',
        min: 1,
        max: 10,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The super resolved output image.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from super_resolution.api import super_resolution
from im2im import Image as IM, im2im
import torch

if torch.cuda.is_available():
  in_im = im2im(${inputs.image}, 'torch.gpu')
else:
  in_im = im2im(${inputs.image}, 'torch')
e_super_res_image = super_resolution(in_im.raw_image, ${inputs.scale})
metadata = {'data_representation': 'numpy.ndarray', "color_channel": "gray", "channel_order": "none", "minibatch_input": False, "image_data_type": "uint8", "device": "cpu"}
array = e_super_res_image.numpy()[0][0]
array_min, array_max = array.min(), array.max()
array_scaled = (array - array_min) / (array_max - array_min)
array_uint8 = (array_scaled * 255).astype(np.uint8)
${outputs.image} = IM(array_uint8, metadata)`;
    }
  }
};
