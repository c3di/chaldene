const captureHistogramFunctionName: string = 'capture_histogram';

export const HistogramCaptureDependencies = `
import numpy as np
from PIL import Image
from comm import create_comm

comm = create_comm(target_name='inspection')

def ${captureHistogramFunctionName}(image, handleIdentifier):
    # If image is an IM object, get its raw_image
    if hasattr(image, 'raw_image'):
        image = image.raw_image
    
    # Convert numpy array to uint8 if it's float
    if isinstance(image, np.ndarray):
        if image.dtype == np.float64 or image.dtype == np.float32:
            image = (image * 255).astype(np.uint8)
        image = Image.fromarray(image)
    
    # Get histogram data
    hist = image.histogram()
    
    # Convert to numpy array and normalize
    hist = np.array(hist, dtype=np.float64)
    hist = hist / np.max(hist) if np.max(hist) > 0 else hist

    # Send histogram data through comm
    comm.send({
        "handle_id": handleIdentifier,
        "histogram": {
            "type": "grayscale",
            "data": hist.tolist()
        }
    })
`;

export function captureHistogramCode(
  imageVar: string,
  targetHandleId: string
): string {
  return `${captureHistogramFunctionName}(${imageVar}, "${targetHandleId}")`;
}
