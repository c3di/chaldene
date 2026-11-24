# Node reference

This page lists every registered processing node in Chaldene: what it does and the library function it calls. It is generated from the node specifications in `src/NodeSpec/`. Most image nodes also convert their input and output with `im2im`; that converter call is left out of the "Underlying function" column.

Node names are the labels shown in the search menu. The identifier is the name of the node specification in the source file.

## Dependencies and version pins

Core dependencies are pinned in `pyproject.toml`, so a pip installation of Chaldene uses the same library versions on every machine. The Binder demo environment (`binder/environment.yml`) uses the same versions.

| Library | Pinned version | Used by |
|---|---|---|
| numpy | 2.2.4 | array operations, all numeric nodes |
| pillow | 11.1.0 | image I/O |
| pandas | 2.2.3 | tables and CSV export |
| scikit-image | 0.25.2 | skimage nodes, binary and segmentation nodes |
| scipy | 1.15.2 | segmentation and distance-based nodes |
| opencv-python-headless | 4.11.0.86 | image processing support |
| matplotlib | 3.10.1 | plotting and display |
| pyimagej | 1.7.0 | ImageJ nodes (requires OpenJDK 11) |
| im2im | 0.0.6 | converts between in-memory image representations |
| chaldene-super-resolution | 0.1.0 | super-resolution node |

## Nodes

### Binary image nodes

Source: `src/NodeSpec/Binary.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| auto binarize | `autoBinarizeNodeSpec` | binary | Automatically binarize the input image using the isodata (iterative selection) threshold. | `numpy.asarray; skimage.filters.threshold_isodata` |
| threshold | `thresholdNodeSpec` | binary | Generates a binary image by applying thresholding to the input image using specified upper and lower bounds. Pixels with values within the range are set to 1, while those outside the range are set to 0. | `numpy.where` |
| invert | `invertNodeSpec` | binary | In a binary image, each pixel is either black (0) or white (1). The invert operation switches these values: all black pixels become white, and all white pixels become black. | `skimage.util.invert` |
| binary dilation | `binaryDilationNodeSpec` | binary | Dilation sets a pixel at to the maximum over all pixels in the neighborhood centered at. Dilation enlarges bright regions and shrinks dark regions. | `skimage.morphology.binary_dilation` |
| binary erosion | `binaryErosionNodeSpec` | binary | Erosion sets a pixel at to the minimum over all pixels in the neighborhood centered at. Erosion shrinks bright regions and enlarges dark regions. | `skimage.morphology.binary_erosion` |
| binary opening | `binaryOpeningNodeSpec` | binary | Opening can remove small bright spots (i.e. "salt") and connect small dark cracks. This tends to "open" up (dark) gaps between (bright) features. | `skimage.morphology.binary_opening` |
| binary closing | `binaryClosingNodeSpec` | binary | Closing can remove small dark spots (i.e. "pepper") and connect small bright cracks. This tends to "close" up (dark) gaps between (bright) features. | `skimage.morphology.binary_closing` |
| remove small holes | `removeSmallHolesNodeSpec` | binary | Remove small holes (connected regions of background) within foreground objects in a binary image. It fills in small "holes" or gaps inside objects that you might want to close. | `skimage.morphology.remove_small_holes` |
| remove small objects | `removeSmallObjectsNodeSpec` | binary | Remove small objects (connected regions of foreground) in a binary image. It removes small, isolated objects that are smaller than a specified threshold. | `skimage.morphology.remove_small_objects` |
| split touching objects | `splitTouchingObjectsNodeSpec` | binary | split touching objects (connected regions of foreground) in a binary image. It splits objects that are touching or overlapping. | `numpy.asarray; ndimage.distance_transform_edt; numpy.ones` |

### Comparison nodes

Source: `src/NodeSpec/Comparison.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| binary image difference | `BinaryDifferenceNodeSpec` | comparison | The difference between two binary images. | (see source) |
| grayscale image difference | `GrayscaleDifferenceNodeSpec` | comparison | Computes the difference between two grayscale images. | (see source) |

### Input and output nodes

Source: `src/NodeSpec/IO.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| read image | `readImageNodeSpec` | input & output | Reads a RGB or grayscale JPEG or PNG image. Optionally converts the image to the desired format. | `skimage.io.imread; skimage.img_as_float` |
| save to csv | `saveToCsvNodeSpec` | input & output | Save the input data to a CSV file. | `pandas.DataFrame; os.path.join` |
| save image | `saveImageNodeSpec` | input & output | Save the image data to a file. | `skimage.io.imsave; os.path.join` |
| load height map | `gwyfileLoader` | input & output | Load a height map image from gwy files. | `numpy.interp` |

### General image-processing nodes

Source: `src/NodeSpec/IP.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| crop | `cropNodeSpec` | image editing | (see source) | (see source) |
| denoise bilateral | `denoiseBilateralNodeSpec` | denoise & enhance | Applies bilateral denoising to reduce noise while preserving edges. | `skimage.restoration.denoise_bilateral` |
| gaussian denoise | `GaussianBlurNodeSpec` | denoise & enhance | Apply Gaussian blur to remove noise. | `skimage.filters.gaussian` |
| local contrast enhancement | `CLAHENodeSpec` | denoise & enhance | Contrast Limited Adaptive Histogram Equalization (CLAHE) for local contrast enhancement. | `skimage.exposure.equalize_adapthist` |
| canny edge detection | `CannyNodeSpec` | feature detection | Edge filter an image using the Canny algorithm. | `skimage.feature.canny` |
| batch process | `batchProcessNodeSpec` | batch processing | Process multiple images from a folder. | (see source) |
| collect result per batch | `processResultNodeSpec` | batch processing | Output the result at each batch. | (see source) |

### ImageJ nodes (via PyImageJ)

Source: `src/NodeSpec/ImageJ.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| imagej_analyze_particles | `imageJAnalyzeParticlesNodeSpec` | imagej | Run ImageJ Analyze Particles on a binary image and return measurements. | `pandas.DataFrame; numpy.asarray; scyjava.jimport` |
| imagej_detect_ridges | `imageJDetectRidgesNodeSpec` | imagej | Detect ridges using ImageJ2 segmentation ops with overlay. | `numpy.asarray; numpy.issubdtype; numpy.zeros_like` |
| imagej_detect_junctions | `imageJDetectJunctionsNodeSpec` | imagej | Detect junctions using ImageJ2 segmentation ops with overlay. | `numpy.asarray; numpy.issubdtype; numpy.zeros_like` |
| imagej_ascii | `imageJAsciiNodeSpec` | imagej | Convert image to ASCII art representation. | `ImageJ op net.imagej.ops.image.ascii.DefaultASCII` |
| imagej_cooccurrence_matrix | `imageJCooccurrenceMatrixNodeSpec` | imagej | Calculate gray-level co-occurrence matrix for texture analysis. | `numpy.asarray; pandas.DataFrame; numpy.sum` |
| imagej_distance_transform | `imageJDistanceTransformNodeSpec` | imagej | Calculate distance transform of binary image. | `numpy.asarray; numpy.zeros_like; ImageJ op image.distancetransform` |
| imagej_equation | `imageJEquationNodeSpec` | imagej | Apply mathematical equation to image pixels. | `numpy.asarray; numpy.clip; ImageJ op image.equation` |
| imagej_fill | `imageJFillNodeSpec` | imagej | Fill image with a constant value. | `numpy.asarray; numpy.clip; ImageJ op image.fill` |
| imagej_histogram | `imageJHistogramNodeSpec` | imagej | Calculate image histogram. | `numpy.array; numpy.asarray; numpy.linspace` |
| imagej_integral | `imageJIntegralNodeSpec` | imagej | Calculate integral image (summed area table). | `numpy.asarray; numpy.zeros_like; ImageJ op image.integral` |
| imagej_invert | `imageJInvertNodeSpec` | imagej | Invert image pixel values. | `numpy.asarray; ImageJ op image.invert` |
| imagej_watershed | `imageJWatershedNodeSpec` | imagej | Apply watershed segmentation to image. | `numpy.asarray; numpy.stack; numpy.mean` |

### ImageJ filter nodes (ImageJ ops)

Source: `src/NodeSpec/ImageJFilter.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| imagej_gauss | `ijGaussNodeSpec` | imagej filter | Gaussian blur using ImageJ ops. | `ImageJ op filter.gauss` |
| imagej_median | `ijMedianNodeSpec` | imagej filter | Median filter using ImageJ ops. | `ImageJ op create.img; ImageJ op filter.median; scyjava.jimport` |
| imagej_mean | `ijMeanNodeSpec` | imagej filter | Mean filter using ImageJ ops. | `ImageJ op create.img; ImageJ op filter.mean; scyjava.jimport` |
| imagej_sobel | `ijSobelNodeSpec` | imagej filter | Sobel edge filter using ImageJ ops. | `ImageJ op filter.sobel` |
| imagej_bilateral | `ijBilateralNodeSpec` | imagej filter | Bilateral filter using ImageJ ops. | `ImageJ op create.img; ImageJ op filter.bilateral` |
| imagej_dog | `ijDoGNodeSpec` | imagej filter | Difference of Gaussians using ImageJ ops. | `ImageJ op filter.dog` |
| imagej_variance | `ijVarianceNodeSpec` | imagej filter | Local variance filter using ImageJ ops. | `ImageJ op create.img; ImageJ op filter.variance; scyjava.jimport` |
| imagej_max | `ijMaxNodeSpec` | imagej filter | Local maximum filter using ImageJ ops. | `ImageJ op create.img; ImageJ op filter.max; scyjava.jimport` |
| imagej_min | `ijMinNodeSpec` | imagej filter | Local minimum filter using ImageJ ops. | `ImageJ op create.img; ImageJ op filter.min; scyjava.jimport` |
| imagej_add_poisson_noise | `ijAddPoissonNoiseNodeSpec` | imagej filter | Add Poisson noise using ImageJ ops. | `ImageJ op filter.addPoissonNoise; ImageJ op create.img` |
| imagej_convolve | `ijConvolveNodeSpec` | imagej filter | Convolve with a box kernel using ImageJ ops. | `ImageJ op filter.convolve` |
| imagej_tubeness | `ijTubenessNodeSpec` | imagej filter | Tubeness filter using ImageJ ops. | `ImageJ op filter.tubeness; scyjava.jimport` |
| imagej_dilate | `ijMorphDilateNodeSpec` | imagej filter | Morphological dilation (binary/grayscale). | `ImageJ op create.img; ImageJ op morphology.dilate` |
| imagej_erode | `ijMorphErodeNodeSpec` | imagej filter | Morphological erosion (binary/grayscale). | `ImageJ op create.img; ImageJ op morphology.erode` |
| imagej_open | `ijMorphOpenNodeSpec` | imagej filter | Morphological opening. | `ImageJ op create.img; ImageJ op morphology.open` |
| imagej_close | `ijMorphCloseNodeSpec` | imagej filter | Morphological closing. | `ImageJ op create.img; ImageJ op morphology.close` |
| imagej_tophat | `ijMorphTopHatNodeSpec` | imagej filter | Top-hat filter (white). | `ImageJ op create.img; ImageJ op morphology.topHat` |
| imagej_black_tophat | `ijMorphBlackTopHatNodeSpec` | imagej filter | Black top-hat filter. | `ImageJ op create.img; ImageJ op morphology.blackTopHat` |
| imagej_outline | `ijMorphOutlineNodeSpec` | imagej filter | Outline of binary regions. | `ImageJ op create.img; ImageJ op threshold.apply; ImageJ op create.img` |
| imagej_fill_holes | `ijMorphFillHolesNodeSpec` | imagej filter | Fill holes in binary regions. | `ImageJ op create.img; ImageJ op threshold.apply; ImageJ op create.img` |
| imagej_extract_holes | `ijMorphExtractHolesNodeSpec` | imagej filter | Extract holes from binary regions. | `ImageJ op create.img; ImageJ op threshold.apply; ImageJ op create.img` |
| imagej_flood_fill | `ijMorphFloodFillNodeSpec` | imagej filter | Flood fill from a seed point (binary). | `ImageJ op create.img; ImageJ op threshold.apply; ImageJ op create.img` |

### ImageJ threshold nodes

Source: `src/NodeSpec/ImageJThreshold.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| imagej_threshold_apply | `ijThresholdApplyNodeSpec` | imagej threshold | Apply a numeric threshold producing a binary image. | `ImageJ op create.img; ImageJ op threshold.apply; scyjava.jimport` |
| imagej_threshold | `ijThresholdCombinedNodeSpec` | imagej threshold | Apply ImageJ threshold using a selected method. | `ImageJ op create.img; scyjava.jimport` |

### ImageJ view and transform nodes

Source: `src/NodeSpec/ImageJTransform.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| imagej_concatenate_view | `ijTransformConcatenateViewNodeSpec` | imagej transform | Concatenate two images along an axis as a virtual view. | `ImageJ op transform.zeroMinView; ImageJ op transform.intervalView; ImageJ op transform.concatenateView` |
| imagej_crop | `ijTransformCropNodeSpec` | imagej transform | Crop to a rectangular interval (2D). | `ImageJ op transform.crop` |
| imagej_extend_border_view | `ijTransformExtendBorderViewNodeSpec` | imagej transform | Extend with border value view. | `ImageJ op transform.extendBorderView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_extend_mirror_double_view | `ijTransformExtendMirrorDoubleViewNodeSpec` | imagej transform | Extend with double mirror view. | `ImageJ op transform.extendMirrorDoubleView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_extend_mirror_single_view | `ijTransformExtendMirrorSingleViewNodeSpec` | imagej transform | Extend with single mirror view. | `ImageJ op transform.extendMirrorSingleView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_extend_periodic_view | `ijTransformExtendPeriodicViewNodeSpec` | imagej transform | Extend with periodic tiling view. | `ImageJ op transform.extendPeriodicView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_extend_random_view | `ijTransformExtendRandomViewNodeSpec` | imagej transform | Extend with random values view (seeded). | `ImageJ op transform.extendRandomView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_extend_value_view | `ijTransformExtendValueViewNodeSpec` | imagej transform | Extend with a constant value view. | `ImageJ op transform.extendValueView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_extend_view | `ijTransformExtendViewNodeSpec` | imagej transform | Generic extend view (falls back to border extend). | `ImageJ op transform.extendView; ImageJ op transform.extendBorderView; ImageJ op transform.intervalView` |
| imagej_extend_zero_view | `ijTransformExtendZeroViewNodeSpec` | imagej transform | Extend with zero value view. | `ImageJ op transform.extendZeroView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_flat_iterable_view | `ijTransformFlatIterableViewNodeSpec` | imagej transform | Flat iterable view over the image pixels. | `ImageJ op transform.flatIterableView` |
| imagej_hyper_slice_view | `ijTransformHyperSliceViewNodeSpec` | imagej transform | Extract a hyperslice at the given axis and position. | `ImageJ op transform.hyperSliceView` |
| imagej_interval_view | `ijTransformIntervalViewNodeSpec` | imagej transform | Interval view (2D) from x, y, width, height. | `ImageJ op transform.intervalView` |
| imagej_invert_axis_view | `ijTransformInvertAxisViewNodeSpec` | imagej transform | Invert a given axis (reverse order). | `ImageJ op transform.invertAxisView` |
| imagej_project | `ijTransformProjectNodeSpec` | imagej transform | Project along an axis using ImageJ ops (max reducer). | `ImageJ op transform.project; scyjava.jimport` |
| imagej_rotate_view | `ijTransformRotateViewNodeSpec` | imagej transform | Rotate by 90° increments using ops.transform.rotateView on axes (0,1). | `ImageJ op transform.rotateView; ImageJ op transform.zeroMinView; ImageJ op copy.rai` |
| imagej_scale_view | `ijTransformScaleViewNodeSpec` | imagej transform | Scale view by factors (2D). | `ImageJ op transform.scaleView; ImageJ op transform.zeroMinView; ImageJ op copy.rai` |
| imagej_shear_view | `ijTransformShearViewNodeSpec` | imagej transform | Shear view along an axis by a factor. | `ImageJ op transform.shearView; ImageJ op transform.intervalView; ImageJ op transform.zeroMinView` |
| imagej_subsample_view | `ijTransformSubsampleViewNodeSpec` | imagej transform | Subsample view with given step sizes (2D). | `ImageJ op transform.subsampleView` |
| imagej_translate_view | `ijTransformTranslateViewNodeSpec` | imagej transform | Translate view by dx, dy (2D). | `ImageJ op transform.translateView` |
| imagej_zero_min_view | `ijTransformZeroMinViewNodeSpec` | imagej transform | Shift the min coordinate of the interval to zero. | `ImageJ op transform.zeroMinView` |

### Segmentation and measurement nodes

Source: `src/NodeSpec/Segmentations.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| watershed segmentation | `watershedNodeSpec` | segmentation | Separating overlapping or touching objects in an image into distinct regions or segments. | `skimage.filters.sobel; ndimage.label; skimage.segmentation.watershed` |
| summary | `regionpropsNodeSpec` | segmentation | Extract properties (index, pixel count, position) of each segments after applying segmentation algorithms. | `skimage.measure.regionprops_table; pandas.DataFrame` |
| segmentes size | `segmentesSizeNodeSpec` | segmentation | Extract size of each segments after applying segmentation algorithms. | `skimage.measure.regionprops_table` |

### scikit-image adjustment, filter, feature, transform and restoration nodes

Source: `src/NodeSpec/skimage.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| Adjust Gamma | `adjustGamma` | adjust | Performs gamma correction on an image. | `skimage.exposure.adjust_gamma` |
| Adjust Log | `adjustLog` | adjust | Performs logarithmic correction on an image. | `skimage.exposure.adjust_log` |
| Adaptive Histogram Equalization | `equalizeAdaptHist` | adjust | Performs contrast-limited adaptive histogram equalization (CLAHE) on an image. | `skimage.exposure.equalize_adapthist` |
| Histogram Equalization | `equalizeHist` | adjust | Enhances contrast in an image using histogram equalization. | `skimage.exposure.equalize_hist` |
| Blob Detection (DoG) | `blobDoG` | feature detection | Detects blobs in an image using the Difference of Gaussian method. | `skimage.feature.blob_dog; numpy.copy; skimage.draw.disk` |
| Blob Detection (DoH) | `blobDoH` | feature detection | Detects blobs in an image using the Determinant of Hessian method. | `skimage.feature.blob_doh; numpy.copy; skimage.draw.disk` |
| Blob Detection (LoG) | `blobLoG` | feature detection | Detects blobs in an image using the Laplacian of Gaussian method. | `skimage.feature.blob_log; numpy.copy; skimage.draw.disk` |
| Harris Corner Detection | `cornerHarris` | feature detection | Detects corners in an image using the Harris corner detection algorithm. | `skimage.feature.corner_harris; skimage.color.gray2rgb` |
| Adjust Sigmoid | `adjustSigmoid` | adjust | Applies a sigmoid correction to an image. | `skimage.exposure.adjust_sigmoid` |
| Farid Filter | `farid` | Image Processing | Finds edges in an image using the Farid operator. | `skimage.filters.farid` |
| Meijering Filter | `meijering` | Image Processing | Enhances continuous linear structures. | `skimage.filters.meijering` |
| Butterworth Filter | `butterworth` | Image Processing | Applies a Butterworth high-pass or low-pass filter. | `skimage.filters.butterworth` |
| Frangi Filter | `frangi` | Image Processing | Enhances vessel-like structures in an image. | `skimage.filters.frangi` |
| Sobel Filter | `sobel` | Image Processing | Finds edges in an image using the Sobel operator. | `skimage.filters.sobel` |
| Hessian Filter | `hessian` | Image Processing | Enhances tubular structures in an image. | `skimage.filters.hessian` |
| Prewitt Filter | `prewitt` | Image Processing | Finds edges in an image using the Prewitt operator. | `skimage.filters.prewitt` |
| Roberts Filter | `roberts` | Image Processing | Finds edges in an image using the Roberts operator. | `skimage.filters.roberts` |
| Sato Filter | `sato` | Image Processing | Enhances tubular structures in an image. | `skimage.filters.sato` |
| Scharr Filter | `scharr` | Image Processing | Finds edges in an image using the Scharr operator. | `skimage.filters.scharr` |
| Black Top-Hat | `blackTophat` | Image Processing | Performs black top-hat morphological operation to enhance dark objects on a bright background. | `skimage.morphology.black_tophat` |
| White Top-Hat | `whiteTophat` | Image Processing | Performs white top-hat morphological operation to enhance bright objects on a dark background. | `skimage.morphology.white_tophat` |
| Radon Transform | `radonTransform` | transform | Computes the Radon transform of an image. | `skimage.transform.radon` |
| Inverse Radon Transform | `iradonTransform` | transform | Performs inverse Radon transform to reconstruct an image from its sinogram. | `skimage.transform.iradon` |
| Inverse Radon Transform (SART) | `iradonSART` | transform | Performs iterative SART algorithm for inverse Radon transform. | `skimage.transform.iradon_sart` |
| Random Noise | `randomNoise` | Image Processing | Adds random noise to an image. | `skimage.util.random_noise` |
| Wiener Filter Denoising | `denoiseWiener` | denoise & enhance | Applies Wiener filter for denoising an image. | `numpy.ones; skimage.restoration.wiener` |
| Non-Local Means Denoising | `denoiseNlMeans` | denoise & enhance | Applies non-local means denoising on an image. | `skimage.restoration.denoise_nl_means` |
| Total Variation Denoising (Bregman) | `denoiseTvBregman` | denoise & enhance | Applies total variation denoising using the Bregman iteration. | `skimage.restoration.denoise_tv_bregman` |
| Total Variation Denoising (Chambolle) | `denoiseTvChambolle` | denoise & enhance | Applies total variation denoising using the Chambolle method. | `skimage.restoration.denoise_tv_chambolle` |

### Super-resolution node

Source: `src/NodeSpec/super_resolution.ts`

| Node | Identifier | Category | Purpose | Underlying function |
|---|---|---|---|---|
| super resolution | `superResolutionNodeSpec` | super resolution | Increase the resolution of the input image using super resolution techniques. | `super_resolution.api.super_resolution` |
