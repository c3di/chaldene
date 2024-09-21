import { registerNodeSpec } from '../ReactVP';
import { thresholdNodeSpec } from './Binary';
import {
  CannyNodeSpec,
  CLAHENodeSpec,
  denoiseBilateralNodeSpec,
  dilationNodeSpec,
  erosionNodeSpec,
  invertNodeSpec,
  openingNodeSpec
} from './IP';
import { readImageNodeSpec, saveImageNodeSpec, saveToCsvNodeSpec } from './IO';
import { regionpropsNodeSpec, watershedNodeSpec } from './Segmentations';

export function defaultNodeSpecs(): void {
  registerNodeSpec(readImageNodeSpec);
  registerNodeSpec(dilationNodeSpec);
  registerNodeSpec(erosionNodeSpec);
  registerNodeSpec(openingNodeSpec);
  registerNodeSpec(denoiseBilateralNodeSpec);
  registerNodeSpec(CLAHENodeSpec);
  registerNodeSpec(CannyNodeSpec);
  registerNodeSpec(invertNodeSpec);
  registerNodeSpec(watershedNodeSpec);
  registerNodeSpec(regionpropsNodeSpec);
  registerNodeSpec(saveToCsvNodeSpec);
  registerNodeSpec(saveImageNodeSpec);
  registerNodeSpec(thresholdNodeSpec);
}
