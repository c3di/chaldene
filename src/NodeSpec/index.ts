import { registerNodeSpec } from '../ReactVP';
import {
  thresholdNodeSpec,
  binaryDilationNodeSpec,
  binaryErosionNodeSpec,
  binaryOpeningNodeSpec,
  binaryClosingNodeSpec
} from './Binary';
import {
  CannyNodeSpec,
  CLAHENodeSpec,
  denoiseBilateralNodeSpec,
  invertNodeSpec
} from './IP';
import { readImageNodeSpec, saveImageNodeSpec, saveToCsvNodeSpec } from './IO';
import { regionpropsNodeSpec, watershedNodeSpec } from './Segmentations';
import { differenceHeatmapNodeSpec } from './Comparison';

export function defaultNodeSpecs(): void {
  registerNodeSpec([readImageNodeSpec, saveImageNodeSpec, saveToCsvNodeSpec]);
  registerNodeSpec([watershedNodeSpec, regionpropsNodeSpec]);
  registerNodeSpec([
    thresholdNodeSpec,
    binaryDilationNodeSpec,
    binaryErosionNodeSpec,
    binaryOpeningNodeSpec,
    binaryClosingNodeSpec
  ]);

  registerNodeSpec(denoiseBilateralNodeSpec);
  registerNodeSpec(CLAHENodeSpec);
  registerNodeSpec(CannyNodeSpec);
  registerNodeSpec(invertNodeSpec);
  registerNodeSpec(differenceHeatmapNodeSpec);
}
