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
  imageJAnalyzeParticlesNodeSpec,
  imageJDetectJunctionsNodeSpec,
  imageJDetectRidgesNodeSpec,
  imageJAsciiNodeSpec,
  imageJDistanceTransformNodeSpec,
  imageJEquationNodeSpec,
  imageJFillNodeSpec,
  imageJHistogramNodeSpec,
  imageJIntegralNodeSpec,
  imageJInvertNodeSpec,
  imageJWatershedNodeSpec,
  imageJCooccurrenceMatrixNodeSpec
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
  ijMorphOpenNodeSpec,
  ijMorphCloseNodeSpec,
  ijMorphTopHatNodeSpec,
  ijMorphBlackTopHatNodeSpec,
  ijMorphDilateNodeSpec,
  ijMorphErodeNodeSpec,
  ijMorphFloodFillNodeSpec,
  ijMorphExtractHolesNodeSpec,
  ijMorphOutlineNodeSpec,
  ijMorphFillHolesNodeSpec
} from './ImageJFilter';
import {
  ijThresholdApplyNodeSpec,
  ijThresholdCombinedNodeSpec
} from './ImageJThreshold';
import {
  ijTransformConcatenateViewNodeSpec,
  ijTransformCropNodeSpec,
  ijTransformExtendBorderViewNodeSpec,
  ijTransformExtendMirrorDoubleViewNodeSpec,
  ijTransformExtendMirrorSingleViewNodeSpec,
  ijTransformExtendPeriodicViewNodeSpec,
  ijTransformExtendRandomViewNodeSpec,
  ijTransformExtendValueViewNodeSpec,
  ijTransformExtendViewNodeSpec,
  ijTransformExtendZeroViewNodeSpec,
  ijTransformFlatIterableViewNodeSpec,
  ijTransformHyperSliceViewNodeSpec,
  ijTransformIntervalViewNodeSpec,
  ijTransformInvertAxisViewNodeSpec,
  ijTransformProjectNodeSpec,
  ijTransformRotateViewNodeSpec,
  ijTransformScaleViewNodeSpec,
  ijTransformShearViewNodeSpec,
  ijTransformSubsampleViewNodeSpec,
  ijTransformTranslateViewNodeSpec,
  ijTransformZeroMinViewNodeSpec
} from './ImageJTransform';

import {
  adjustGamma,
  adjustLog,
  equalizeAdaptHist,
  equalizeHist,
  blobDoG,
  blobLoG,
  cornerHarris,
  adjustSigmoid,
  farid,
  meijering,
  butterworth,
  frangi,
  sobel,
  hessian,
  prewitt,
  roberts,
  sato,
  scharr,
  blackTophat,
  whiteTophat,
  radonTransform,
  iradonTransform,
  iradonSART,
  randomNoise,
  denoiseWiener,
  denoiseNlMeans,
  denoiseTvBregman,
  denoiseTvChambolle
} from './skimage';

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
  registerNodeSpec([
    imageJAnalyzeParticlesNodeSpec,
    imageJDetectJunctionsNodeSpec,
    imageJDetectRidgesNodeSpec,
    imageJCooccurrenceMatrixNodeSpec,
    imageJAsciiNodeSpec,
    imageJDistanceTransformNodeSpec,
    imageJEquationNodeSpec,
    imageJFillNodeSpec,
    imageJHistogramNodeSpec,
    imageJIntegralNodeSpec,
    imageJInvertNodeSpec,
    imageJWatershedNodeSpec
  ]);
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
    ijMorphOpenNodeSpec,
    ijMorphCloseNodeSpec,
    ijMorphTopHatNodeSpec,
    ijMorphBlackTopHatNodeSpec,
    ijMorphDilateNodeSpec,
    ijMorphErodeNodeSpec,
    ijMorphFloodFillNodeSpec,
    ijMorphExtractHolesNodeSpec,
    ijMorphOutlineNodeSpec,
    ijMorphFillHolesNodeSpec
  ]);
  registerNodeSpec([ijThresholdApplyNodeSpec, ijThresholdCombinedNodeSpec]);
  registerNodeSpec([
    ijTransformConcatenateViewNodeSpec,
    ijTransformCropNodeSpec,
    ijTransformExtendBorderViewNodeSpec,
    ijTransformExtendMirrorDoubleViewNodeSpec,
    ijTransformExtendMirrorSingleViewNodeSpec,
    ijTransformExtendPeriodicViewNodeSpec,
    ijTransformExtendRandomViewNodeSpec,
    ijTransformExtendValueViewNodeSpec,
    ijTransformExtendViewNodeSpec,
    ijTransformExtendZeroViewNodeSpec,
    ijTransformFlatIterableViewNodeSpec,
    ijTransformHyperSliceViewNodeSpec,
    ijTransformIntervalViewNodeSpec,
    ijTransformInvertAxisViewNodeSpec,
    ijTransformProjectNodeSpec,
    ijTransformRotateViewNodeSpec,
    ijTransformScaleViewNodeSpec,
    ijTransformShearViewNodeSpec,
    ijTransformSubsampleViewNodeSpec,
    ijTransformTranslateViewNodeSpec,
    ijTransformZeroMinViewNodeSpec
  ]);
  registerNodeSpec([
    adjustGamma,
    adjustLog,
    equalizeAdaptHist,
    equalizeHist,
    blobDoG,
    blobLoG,
    cornerHarris,
    adjustSigmoid,
    farid,
    meijering,
    butterworth,
    frangi,
    sobel,
    hessian,
    prewitt,
    roberts,
    sato,
    scharr,
    blackTophat,
    whiteTophat,
    radonTransform,
    iradonTransform,
    iradonSART,
    randomNoise,
    denoiseWiener,
    denoiseNlMeans,
    denoiseTvBregman,
    denoiseTvChambolle
  ]);
}
