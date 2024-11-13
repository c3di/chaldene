const captureDifferenceHeatmapFunctionName: string =
  'capture_difference_heatmap';

export const DifferenceHeatmapCaptureDependencies = `
import json
import numpy as np
from PIL import Image
from comm import create_comm
from im2im import im2im

comm = create_comm(target_name='inspection')


def ${captureDifferenceHeatmapFunctionName}(image1, image2, handleIdentifier):
    # Convert both images to numpy arrays in the same format
    image1 = im2im(image1, 'numpy.gray_float64(0to1)').raw_image
    image2 = im2im(image2, 'numpy.gray_float64(0to1)').raw_image
    
    # Calculate normalized difference
    normalized_diff = np.abs(image1 - image2)
    
    # Ensure we have actual differences (avoid division by zero)
    max_diff = np.max(normalized_diff)
    min_diff = np.min(normalized_diff)
    
    if max_diff > min_diff:
        # Normalize to [0, 1] range
        normalized_diff = (normalized_diff - min_diff) / (max_diff - min_diff)
    else:
        normalized_diff = np.zeros_like(normalized_diff)

    # Send the heatmap data
    comm.send({
        "handle_id": handleIdentifier,
        "differences": normalized_diff.flatten().tolist(),
    })
`;

export function captureDifferenceHeatmapCode(
  image1Var: string,
  image2Var: string,
  targetHandleId: string
): string {
  return `${captureDifferenceHeatmapFunctionName}(${image1Var}, ${image2Var}, "${targetHandleId}")`;
}
