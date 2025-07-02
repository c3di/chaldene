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
  autoBinarizeNodeSpec,
  otsuThresholdNodeSpec
} from './Binary';
import {
  CannyNodeSpec,
  CLAHENodeSpec,
  denoiseBilateralNodeSpec,
  cropNodeSpec,
  batchProcessNodeSpec,
  processResultNodeSpec,
  GaussianBlurNodeSpec,
  adjustGammaNodeSpec,
  sobelNodeSpec,
  unsharpMaskNodeSpec,
  denoiseWaveletNodeSpec
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
  footprintRectangleNodeSpec,
  diamondNodeSpec,
  diskNodeSpec,
  octahedronNodeSpec,
  ballNodeSpec,
  octagonNodeSpec,
  starNodeSpec
} from './skimage_morphology';

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
    splitTouchingObjectsNodeSpec,
    otsuThresholdNodeSpec
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
  registerNodeSpec([adjustGammaNodeSpec, sobelNodeSpec]);
  registerNodeSpec(superResolutionNodeSpec);
  registerNodeSpec(unsharpMaskNodeSpec);
  registerNodeSpec(denoiseWaveletNodeSpec);
  registerNodeSpec([
    footprintRectangleNodeSpec,
    diamondNodeSpec,
    diskNodeSpec,
    octahedronNodeSpec,
    ballNodeSpec,
    octagonNodeSpec,
    starNodeSpec
  ]);
}
