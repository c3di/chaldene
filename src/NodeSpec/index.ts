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
import { CannyNodeSpec, CLAHENodeSpec, denoiseBilateralNodeSpec } from './IP';
import { readImageNodeSpec, saveImageNodeSpec, saveToCsvNodeSpec } from './IO';
import { regionpropsNodeSpec, watershedNodeSpec } from './Segmentations';
import { differenceHeatmapNodeSpec } from './Comparison';

export function defaultNodeSpecs(): void {
  registerNodeSpec([readImageNodeSpec, saveImageNodeSpec, saveToCsvNodeSpec]);
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
  registerNodeSpec(differenceHeatmapNodeSpec);
}
