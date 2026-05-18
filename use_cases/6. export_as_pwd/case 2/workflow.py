from skimage import io
from im2im import Image as IM
from skimage import img_as_float
import numpy as np
from im2im import Image as IM, im2im
from skimage import morphology
from numpy import float64
from scipy import ndimage as ndi
from skimage.filters import sobel, gaussian
from skimage.feature import peak_local_max
from skimage.measure import label
from skimage.segmentation import watershed
from skimage.morphology import binary_opening
from skimage import segmentation, filters
from skimage.color import label2rgb
from skimage import measure
import pandas as pd


def read_image(path, mode):
    image = IM(img_as_float(io.imread(path, as_gray=True)), 'numpy.gray_float64(0to1)')
    return image


def threshold(image, range):
    
    in_im = im2im(image, 'numpy.gray_float64(0to1)')
    
    
    lower, upper = range  
    
    # Apply threshold directly to raw image
    binarized_image = np.where((in_im.raw_image >= lower) & 
                              (in_im.raw_image <= upper), 1.0, 0.0)
    
    # Create output image with same metadata as input
    image = IM(binarized_image, in_im.metadata)
    return image


def remove_small_objects(image, min_size):
    in_im = im2im(image, 'numpy.gray_float64(0to1)')
    image = IM(morphology.remove_small_objects(in_im.raw_image.astype(bool), min_size=min_size).astype(float64), in_im.metadata)
    return image


def remove_small_holes(image, area_threshold):
    in_im = im2im(image, 'numpy.gray_float64(0to1)')
    image = IM(morphology.remove_small_holes(in_im.raw_image.astype(bool), area_threshold=area_threshold).astype(float64), in_im.metadata)
    return image


def split_touching_objects(image, sigma):
    
    def split_touching_objects(binary, sigma: float = 3.5):
        """
        Takes a binary image and draws cuts in the objects similar to the ImageJ watershed algorithm [1].
        https://github.com/haesleinhuepf/napari-segment-blobs-and-things-with-membranes/blob/5514d8d1de5964c835e7f71ac257b8b3f0574b90/napari_segment_blobs_and_things_with_membranes/__init__.py#L115C1-L149C37
        """
        binary = np.asarray(binary)
    
        # typical way of using scikit-image watershed
        distance = ndi.distance_transform_edt(binary)
        blurred_distance = gaussian(distance, sigma=sigma)
        fp = np.ones((3,) * binary.ndim)
        coords = peak_local_max(blurred_distance, footprint=fp, labels=binary)
        mask = np.zeros(distance.shape, dtype=bool)
        mask[tuple(coords.T)] = True
        markers = label(mask)
        labels = watershed(-blurred_distance, markers, mask=binary)
    
        # identify label-cutting edges
        if len(binary.shape) == 2:
            edges = sobel(labels)
            edges2 = sobel(binary)
        else:
            raise NotImplementedError("Only 2D binary images are supported.")
    
        almost = np.logical_not(np.logical_xor(edges != 0, edges2 != 0)) * binary
        return binary_opening(almost)
    
    in_im = im2im(image, 'numpy.gray_float64(0to1)')
    image = IM(split_touching_objects(in_im.raw_image.astype(bool), sigma=sigma).astype(float64), in_im.metadata)
    return image


def binary_erosion(image):
    in_im = im2im(image, 'numpy.gray_float64(0to1)')
    image = IM(morphology.binary_erosion(in_im.raw_image), in_im.metadata)
    return image


def watershed_segmentation(image, underlay_image, granularity):
    in_im = im2im(image, 'numpy.gray_float64(0to1)')
    if in_im.raw_image.ndim == 2:
        region_of_interest = in_im.raw_image >=0.9
    elif in_im.raw_image.ndim ==3 and in_im.raw_image.shape[2] ==3:
        region_of_insterest = np.all(in_im.raw_image >=0.9, axis=-1)
    gradient = filters.sobel(in_im.raw_image)
    markers = ndi.label(gradient < granularity)[0]
    segments = segmentation.watershed(gradient, markers=markers, mask=region_of_interest)
    if underlay_image is not None:
        underlay_im = underlay_image.raw_image
    else:
        underlay_im = None
    vis = IM(label2rgb(segments, bg_label=0, image=underlay_im), {**in_im.metadata, 'color_channel': 'rgb', 'channel_order': 'channel last'})
    return {"segments": segments, "vis": vis}


def summary(segments):
    summary = measure.regionprops_table(segments, properties=['label', 'centroid', 'num_pixels'])
    data = pd.DataFrame(summary)
    total_labels = len(data['label'])
    average_num_pixels = data['num_pixels'].mean()
    print(f"Number of segments: {total_labels}")
    print(f"Average segments pixels size: {average_num_pixels}")
    
    data['Position(x, y)'] = list(zip(data['centroid-1'], data['centroid-0']))
    data = data.drop(columns=['centroid-0', 'centroid-1'])
    summary = data.rename(columns={
        'label': 'Index',
        'num_pixels': 'Pixel Count'
    })
    return summary
