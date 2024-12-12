const captureDifferenceFunctionName: string = 'capture_difference';

export const DifferenceCaptureDependencies = `
import json
import numpy as np
from PIL import Image
from comm import create_comm
from im2im import im2im

comm = create_comm(target_name='inspection')


def ${captureDifferenceFunctionName}(image1, image2, handleIdentifier):
    # Convert both images to numpy arrays in the same format
    image1 = im2im(image1, 'numpy.gray_float64(0to1)').raw_image
    image2 = im2im(image2, 'numpy.gray_float64(0to1)').raw_image
    
    # Calculate raw difference
    diff = image2 - image1
    
    # Check if images are binary 
    is_binary = np.all(np.logical_or(np.isclose(image1, 0), np.isclose(image1, 1))) and \
                np.all(np.logical_or(np.isclose(image2, 0), np.isclose(image2, 1)))
    
    if is_binary:
        # For binary images: round to exact -1, 0, 1 values
        normalized_diff = np.round(diff, decimals=3)
    else:
        # For non-binary images: normalize to [-1, 1] range
        max_diff = np.max(np.abs(diff))
        if max_diff > 0:
            normalized_diff = diff / max_diff
        else:
            normalized_diff = diff

    # Send the heatmap data as 2D array
    comm.send({
        "handle_id": handleIdentifier,
        "differences": normalized_diff.tolist(), 
    })
`;

export function captureDifferenceCode(
  image1Var: string,
  image2Var: string,
  targetHandleId: string
): string {
  return `${captureDifferenceFunctionName}(${image1Var}, ${image2Var}, "${targetHandleId}")`;
}
