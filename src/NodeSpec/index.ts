import { registerNodeSpec } from '../ReactVP';
import { superResolutionNodeSpec } from './super_resolution';
import {
  thresholdNodeSpec,
  invertNodeSpec,
  binaryDilationNodeSpec,
  binaryErosionNodeSpec,
  binaryOpeningNodeSpec,
  binaryClosingNodeSpec,
  removeSmallHolesNodeSpec,
  removeSmallObjectsNodeSpec,
  splitTouchingObjectsNodeSpec,
  autoBinarizeNodeSpec
} from './Binary';
import {
  CannyNodeSpec,
  CLAHENodeSpec,
  denoiseBilateralNodeSpec,
  cropNodeSpec,
  batchProcessNodeSpec,
  processResultNodeSpec,
  GaussianBlurNodeSpec
} from './IP';
import {
  readImageNodeSpec,
  saveImageNodeSpec,
  saveToCsvNodeSpec,
  gwyfileLoader
} from './IO';
import {
  regionpropsNodeSpec,
  watershedNodeSpec,
  segmentesSizeNodeSpec
} from './Segmentations';
import {
  BinaryDifferenceNodeSpec,
  GrayscaleDifferenceNodeSpec
} from './Comparison';
import {
  imageJAnalyzeParticlesNodeSpec
} from './ImageJ';
import {
  ijGaussNodeSpec,
  ijMedianNodeSpec,
  ijMeanNodeSpec,
  ijSobelNodeSpec,
  ijBilateralNodeSpec,
  ijDoGNodeSpec,
  ijVarianceNodeSpec,
  ijMaxNodeSpec,
  ijMinNodeSpec,
  ijAddPoissonNoiseNodeSpec,
  ijConvolveNodeSpec,
  ijTubenessNodeSpec,
} from './ImageJOps';
import {
  ijThresholdApplyNodeSpec,
  ijThresholdPercentileNodeSpec,
  ijThresholdCombinedNodeSpec,
} from './ImageJThreshold';

export function defaultNodeSpecs(): void {
  registerNodeSpec([
    readImageNodeSpec,
    saveImageNodeSpec,
    saveToCsvNodeSpec,
    processResultNodeSpec,
    gwyfileLoader
  ]);
  registerNodeSpec([
    thresholdNodeSpec,
    autoBinarizeNodeSpec,
    invertNodeSpec,
    binaryDilationNodeSpec,
    binaryErosionNodeSpec,
    binaryOpeningNodeSpec,
    binaryClosingNodeSpec,
    removeSmallHolesNodeSpec,
    removeSmallObjectsNodeSpec,
    splitTouchingObjectsNodeSpec
  ]);
  registerNodeSpec([
    denoiseBilateralNodeSpec,
    GaussianBlurNodeSpec,
    CLAHENodeSpec
  ]);
  registerNodeSpec(CannyNodeSpec);
  registerNodeSpec([
    watershedNodeSpec,
    regionpropsNodeSpec,
    segmentesSizeNodeSpec
  ]);
  registerNodeSpec([BinaryDifferenceNodeSpec, GrayscaleDifferenceNodeSpec]);
  registerNodeSpec([cropNodeSpec, batchProcessNodeSpec]);
  registerNodeSpec(superResolutionNodeSpec);
  registerNodeSpec([ imageJAnalyzeParticlesNodeSpec]);
  registerNodeSpec([
    ijGaussNodeSpec,
    ijMedianNodeSpec,
    ijMeanNodeSpec,
    ijSobelNodeSpec,
    ijBilateralNodeSpec,
    ijDoGNodeSpec,
    ijVarianceNodeSpec,
    ijMaxNodeSpec,
    ijMinNodeSpec,
    ijAddPoissonNoiseNodeSpec,
    ijConvolveNodeSpec,
    ijTubenessNodeSpec,
  ]);
  registerNodeSpec([
    ijThresholdApplyNodeSpec,
    ijThresholdPercentileNodeSpec,
    ijThresholdCombinedNodeSpec,
  ]);
}
