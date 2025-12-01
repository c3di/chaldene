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
import {adjustGamma, adjustLog, equalizeAdaptHist, equalizeHist, blobDoG, blobLoG, cornerHarris,adjustSigmoid,farid,meijering,butterworth,frangi, sobel, hessian, prewitt,roberts,
  sato, scharr, blackTophat, whiteTophat, radonTransform, iradonTransform, iradonSART, randomNoise, denoiseWiener, denoiseNlMeans, denoiseTvBregman, denoiseTvChambolle,

} from './skimage'

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
  registerNodeSpec([adjustGamma, adjustLog, equalizeHist, equalizeAdaptHist, blobDoG, blobLoG, cornerHarris, adjustSigmoid, farid, meijering, butterworth, frangi, sobel, hessian, prewitt, roberts,
    sato, scharr, blackTophat, whiteTophat, radonTransform, iradonTransform, iradonSART, randomNoise, denoiseWiener, denoiseNlMeans, denoiseTvBregman, denoiseTvChambolle,
  ]);
}
