import { registerNodeSpec } from '../ReactVP';
import {
  thresholdNodeSpec,
  invertNodeSpec,
  binaryDilationNodeSpec,
  binaryErosionNodeSpec,
  binaryOpeningNodeSpec,
  binaryClosingNodeSpec,
  removeSmallHolesNodeSpec,
  removeSmallObjectsNodeSpec,
  splitTouchingObjectsNodeSpec
} from './Binary';
import {
  CannyNodeSpec,
  CLAHENodeSpec,
  denoiseBilateralNodeSpec,
  cropNodeSpec,
  batchProcessNodeSpec
} from './IP';
import {
  readImageNodeSpec,
  saveImageNodeSpec,
  saveToCsvNodeSpec,
  processResultNodeSpec
} from './IO';
import { regionpropsNodeSpec, watershedNodeSpec } from './Segmentations';
import {
  BinaryDifferenceNodeSpec,
  GrayscaleDifferenceNodeSpec
} from './Comparison';

export function defaultNodeSpecs(): void {
  registerNodeSpec([
    readImageNodeSpec,
    saveImageNodeSpec,
    saveToCsvNodeSpec,
    processResultNodeSpec
  ]);
  registerNodeSpec([
    thresholdNodeSpec,
    invertNodeSpec,
    binaryDilationNodeSpec,
    binaryErosionNodeSpec,
    binaryOpeningNodeSpec,
    binaryClosingNodeSpec,
    removeSmallHolesNodeSpec,
    removeSmallObjectsNodeSpec,
    splitTouchingObjectsNodeSpec
  ]);
  registerNodeSpec([denoiseBilateralNodeSpec, CLAHENodeSpec]);
  registerNodeSpec(CannyNodeSpec);
  registerNodeSpec([watershedNodeSpec, regionpropsNodeSpec]);
  registerNodeSpec([BinaryDifferenceNodeSpec, GrayscaleDifferenceNodeSpec]);
  registerNodeSpec([cropNodeSpec, batchProcessNodeSpec]);
}
