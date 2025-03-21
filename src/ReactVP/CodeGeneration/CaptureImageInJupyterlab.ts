const captureImageFunctionName: string = 'capture_image';

export const ImageCaptureDependencies = `
import io as PythonIO
import base64
import numpy as np
from PIL import Image
from comm import create_comm
from im2im import im2im

comm = create_comm(target_name='inspection')

def ${captureImageFunctionName}(image, handleIdentifier, reference_image=None, original_image=None):
    # Save the image to a BytesIO object
    buf = PythonIO.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    
    # Get image dimensions
    width, height = image.size
    
    # Encode the buffer contents as base64
    image_base64 = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    
    result = {
        "imageUrl": f"data:image/png;base64,{image_base64}",
        "handle_id": handleIdentifier,
        "dimensions": {"width": width, "height": height}
    }
    
    # Calculate difference if reference image is provided
    if reference_image is not None and original_image is not None:
        # Convert both images to numpy arrays in the same format
        image1 = im2im(reference_image, 'numpy.gray_float64(0to1)').raw_image
        image2 = im2im(original_image, 'numpy.gray_float64(0to1)').raw_image
        
        # Check if images are binary 
        is_binary = np.all(np.logical_or(np.isclose(image1, 0), np.isclose(image1, 1))) and \
                    np.all(np.logical_or(np.isclose(image2, 0), np.isclose(image2, 1)))
        
        if is_binary:
            # For binary images: use XOR to compute differences
            # Convert to boolean arrays first
            bool1 = np.isclose(image1, 1)
            bool2 = np.isclose(image2, 1)
            # XOR the boolean arrays and convert to float
            diff = np.logical_xor(bool1, bool2).astype(float)
            normalized_diff = diff  # Already in correct range [0, 1]
            # Convert to [-1, 1] range where 1 means added pixels and -1 means removed pixels
            normalized_diff = np.where(np.logical_and(bool2, ~bool1), 1, 
                                     np.where(np.logical_and(bool1, ~bool2), -1, 0))
        else:
            # For non-binary images: normalize to [-1, 1] range
            diff = image2 - image1
            max_diff = np.max(np.abs(diff))
            if max_diff > 0:
                normalized_diff = diff / max_diff
            else:
                normalized_diff = diff
                
        result["differences"] = normalized_diff.tolist()
    
    # Send the data
    comm.send(result)
`;

export function captureImageCode(
  imageVar: string,
  handleId?: string,
  referenceImageVar?: string
): string {
  const args = [
    `im2im(${imageVar}, 'pil.rgb_gray').raw_image`,
    `"${handleId ?? imageVar}"`,
    referenceImageVar ? `${referenceImageVar}` : 'None',
    imageVar // Always pass the original imageVar for difference calculation
  ];
  return `${captureImageFunctionName}(${args.join(', ')})`;
}
