import { computeNodeSpec } from '../ReactVP';

export const footprintRectangleNodeSpec: computeNodeSpec = {
  name: 'footprint_rectangle',
  displayLabel: 'footprint_rectangle',
  description: 'Generate a rectangular or hyper-rectangular footprint.',
  category: 'morphology',
  inputs: [
    {
      name: 'shape',
      type: 'tuple2',
      displayLabel: 'shape',
      description: 'The length of the footprint in each dimension.',
      defaultValue: [1, 1],
      widget: {
        type: 'Tuple2'
      }
    }
  ],
  outputs: [
    {
      name: 'footprint',
      type: 'array',
      displayLabel: 'footprint',
      description: 'The footprint.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.morphology import footprint_rectangle
${outputs.footprint} = footprint_rectangle(${inputs.shape})`;
    }
  }
};

export const diamondNodeSpec: computeNodeSpec = {
  name: 'diamond',
  displayLabel: 'diamond',
  description: 'Generates a flat, diamond-shaped footprint.',
  category: 'morphology',
  inputs: [
    {
      name: 'radius',
      type: 'number',
      displayLabel: 'radius',
      description: 'The radius of the diamond-shaped footprint.',
      defaultValue: 1,
      widget: {
        type: 'Number',
        min: 0,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'footprint',
      type: 'array',
      displayLabel: 'footprint',
      description:
        'The footprint where elements of the neighborhood are 1 and 0 otherwise.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.morphology import diamond
${outputs.footprint} = diamond(${inputs.radius})`;
    }
  }
};

export const diskNodeSpec: computeNodeSpec = {
  name: 'disk',
  displayLabel: 'disk',
  description: 'Generates a flat, disk-shaped footprint.',
  category: 'morphology',
  inputs: [
    {
      name: 'radius',
      type: 'number',
      displayLabel: 'radius',
      description: 'The radius of the disk-shaped footprint.',
      defaultValue: 1,
      widget: {
        type: 'Number',
        min: 0,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'footprint',
      type: 'array',
      displayLabel: 'footprint',
      description:
        'The footprint where elements of the neighborhood are 1 and 0 otherwise.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.morphology import disk
${outputs.footprint} = disk(${inputs.radius})`;
    }
  }
};

export const octahedronNodeSpec: computeNodeSpec = {
  name: 'octahedron',
  displayLabel: 'octahedron',
  description:
    'Generates a octahedron-shaped footprint. This is the 3D equivalent of a diamond.',
  category: 'morphology',
  inputs: [
    {
      name: 'radius',
      type: 'number',
      displayLabel: 'radius',
      description: 'The radius of the octahedron-shaped footprint.',
      defaultValue: 1,
      widget: {
        type: 'Number',
        min: 0,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'footprint',
      type: 'array',
      displayLabel: 'footprint',
      description:
        'The footprint where elements of the neighborhood are 1 and 0 otherwise.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.morphology import octahedron
${outputs.footprint} = octahedron(${inputs.radius})`;
    }
  }
};

export const ballNodeSpec: computeNodeSpec = {
  name: 'ball',
  displayLabel: 'ball',
  description:
    'Generates a ball-shaped footprint. This is the 3D equivalent of a disk.',
  category: 'morphology',
  inputs: [
    {
      name: 'radius',
      type: 'number',
      displayLabel: 'radius',
      description: 'The radius of the ball-shaped footprint.',
      defaultValue: 1.0,
      widget: {
        type: 'Number',
        min: 0,
        step: 0.1
      }
    }
  ],
  outputs: [
    {
      name: 'footprint',
      type: 'array',
      displayLabel: 'footprint',
      description:
        'The footprint where elements of the neighborhood are 1 and 0 otherwise.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.morphology import ball
${outputs.footprint} = ball(${inputs.radius})`;
    }
  }
};

export const octagonNodeSpec: computeNodeSpec = {
  name: 'octagon',
  displayLabel: 'octagon',
  description: 'Generates an octagon shaped footprint.',
  category: 'morphology',
  inputs: [
    {
      name: 'size_x',
      type: 'number',
      displayLabel: 'size_x',
      description: 'The size of the horizontal and vertical sides.',
      defaultValue: 3,
      widget: {
        type: 'Number',
        min: 1,
        step: 1
      }
    },
    {
      name: 'size_y',
      type: 'number',
      displayLabel: 'size_y',
      description: 'The height or width of the slanted sides.',
      defaultValue: 1,
      widget: {
        type: 'Number',
        min: 1,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'footprint',
      type: 'array',
      displayLabel: 'footprint',
      description:
        'The footprint where elements of the neighborhood are 1 and 0 otherwise.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.morphology import octagon
${outputs.footprint} = octagon(${inputs.size_x}, ${inputs.size_y})`;
    }
  }
};

export const starNodeSpec: computeNodeSpec = {
  name: 'star',
  displayLabel: 'star',
  description: 'Generates a star shaped footprint with 8 vertices.',
  category: 'morphology',
  inputs: [
    {
      name: 'size',
      type: 'number',
      displayLabel: 'size',
      description:
        'Parameter deciding the size of the star structural element.',
      defaultValue: 1,
      widget: {
        type: 'Number',
        min: 1,
        step: 1
      }
    }
  ],
  outputs: [
    {
      name: 'footprint',
      type: 'array',
      displayLabel: 'footprint',
      description:
        'The footprint where elements of the neighborhood are 1 and 0 otherwise.'
    }
  ],
  codeGenerators: {
    Python: (
      inputs: Record<string, string>,
      outputs: Record<string, string>
    ) => {
      return `from skimage.morphology import star
${outputs.footprint} = star(${inputs.size})`;
    }
  }
};
