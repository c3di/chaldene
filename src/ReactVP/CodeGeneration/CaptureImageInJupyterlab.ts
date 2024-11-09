const captureImageFunctionName: string = 'capture_image';

export const ImageCaptureDependencies = `
import io as PythonIO
import base64
import numpy as np
from PIL import Image
from comm import create_comm
from im2im import im2im

comm = create_comm(target_name='inspection')

def ${captureImageFunctionName}(image, handleIdentifier):
    # If image is an IM object, get its raw_image
    if hasattr(image, 'raw_image'):
        image = image.raw_image
        
    # Convert numpy array to uint8 if it's float
    if isinstance(image, np.ndarray):
        if image.dtype == np.float64 or image.dtype == np.float32:
            image = (image * 255).astype(np.uint8)
        image = Image.fromarray(image)
    
    # Save the image to a BytesIO object
    buf = PythonIO.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    
    # Get image dimensions
    width, height = image.size
    
    # Encode the buffer contents as base64
    image_base64 = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    
    # Send the image data
    comm.send({
        "imageUrl": f"data:image/png;base64,{image_base64}",
        "handle_id": handleIdentifier,
        "dimensions": {"width": width, "height": height}
    })
`;

export function captureImageCode(imageVar: string): string {
  return `${captureImageFunctionName}(${imageVar}, "${imageVar}")`;
}
