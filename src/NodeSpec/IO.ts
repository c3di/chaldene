import { computeNodeSpec } from '../ReactVP';

export const readImageNodeSpec: computeNodeSpec = {
  name: 'read_image',
  displayLabel: 'read image',
  description:
    'Reads a RGB or grayscale JPEG or PNG image. Optionally converts the image to the desired format.',
  category: 'input & output',
  inputs: [
    {
      name: 'path',
      type: 'string',
      displayLabel: 'file',
      description: 'path of the JPEG or PNG image.',
      widget: {
        type: 'FileInputFromServer',
        extensions: ['.jpg', '.jpeg', '.png']
      }
    },
    {
      name: 'mode',
      displayLabel: 'mode',
      description:
        'mode - The read mode used for optionally converting the image. Default: GRAY.',
      defaultValue: 'GRAY',
      widget: {
        type: 'Dropdown',
        options: ['GRAY', 'RGB']
      }
    }
  ],
  outputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The image read from the file.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      const import1 = 'from skimage import io';
      const import2 = 'from im2im import Image as IM';
      const import3 = 'from im2im import get_possible_metadata';

      if (inputs.mode === 'RGB') {
        return `${import1}
${import2}
${import3}
${outputs.image} = IM(io.imread(${inputs.path}, as_gray=False), 'numpy.rgb_uint8')`;
      }
      return `${import1}
${import2}
${import3}
from skimage import img_as_float
${outputs.image} = IM(img_as_float(io.imread(${inputs.path}, as_gray=True)), 'numpy.gray_float64(0to1)')`;
    }
  }
};

export const saveToCsvNodeSpec: computeNodeSpec = {
  name: 'save_to_csv',
  displayLabel: 'save to csv',
  description: 'Save the input data to a CSV file.',
  category: 'input & output',
  inputs: [
    {
      name: 'data',
      type: 'summary',
      displayLabel: 'data',
      description: 'The data(including summary and ...) to save as a CSV.'
    },
    {
      name: 'name',
      type: 'string',
      displayLabel: 'name',
      description: 'CSV File to save the data.',
      defaultValue: 'export.csv',
      widget: {
        type: 'String',
        placeholder: 'for example: export.csv'
      }
    },
    {
      name: 'destination',
      type: 'string',
      displayLabel: 'destination',
      description: 'The folder where the file will be saved.',
      widget: {
        type: 'FileInputFromServer',
        extensions: []
      }
    }
  ],
  outputs: [],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `import pandas as pd
from os.path import join
pd.DataFrame(${inputs.data}).to_csv(join(${inputs.destination}, ${inputs.name}), index=False)`;
    }
  }
};

export const saveImageNodeSpec: computeNodeSpec = {
  name: 'save_image',
  displayLabel: 'save image',
  description: 'Save the image data to a file.',
  category: 'input & output',
  inputs: [
    {
      name: 'image',
      type: 'image',
      displayLabel: 'image',
      description: 'The image to save.'
    },
    {
      name: 'name',
      type: 'string',
      displayLabel: 'name',
      description: 'PNG File to save the image.',
      defaultValue: 'image.png',
      widget: {
        type: 'String',
        placeholder: 'for example: image.png'
      }
    },
    {
      name: 'destination',
      type: 'string',
      displayLabel: 'destination',
      description: 'The folder where the image file will be saved.',
      widget: {
        type: 'FileInputFromServer',
        extensions: []
      }
    }
  ],
  outputs: [],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage import io
from os.path import join
in_im = im2im(${inputs.image}, 'numpy.uint8')
io.imsave(join(${inputs.destination}, ${inputs.name}), in_im.raw_image)`;
    }
  }
};
