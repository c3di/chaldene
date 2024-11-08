const captureHistogramFunctionName: string = 'capture_histogram';

export const HistogramCaptureDependencies = `
import numpy as np
from PIL import Image
from comm import create_comm
from im2im import im2im

comm = create_comm(target_name='inspection')

def ${captureHistogramFunctionName}(image, handleIdentifier):
    # Convert to PIL image
    pil_image = im2im(image, 'pil.rgb_gray').raw_image
    
    # Convert to grayscale if not already
    if pil_image.mode != 'L':
        pil_image = pil_image.convert('L')
    
    # Get histogram data
    hist = pil_image.histogram()
    
    # Convert to numpy array and normalize
    hist = np.array(hist, dtype=np.float64)
    hist = hist / np.max(hist) if np.max(hist) > 0 else hist
    
    # Send histogram data through comm
    comm.send({
        "handle_id": handleIdentifier,
        "histogram": hist.tolist()
    })
`;

export function captureHistogramCode(
  imageVar: string,
  targetHandleId: string
): string {
  return `${captureHistogramFunctionName}(${imageVar}, "${targetHandleId}")`;
}
