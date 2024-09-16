const captureImageFunctionName: string = 'capture_image';

export const ImageCaptureDependencies = `
import io as PythonIO
import base64
from PIL import Image
from comm import create_comm
from im2im import im2im

comm = create_comm(target_name='capture_image')

def ${captureImageFunctionName}(image, handleIdentifier):
    # Save the image to a BytesIO object
    buf = PythonIO.BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)
    # Encode the buffer contents as base64
    image_base64 = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    # image_base64 now contains the base64-encoded grayscale image
    comm.send({"image_data": image_base64, "handle_id": handleIdentifier})
`;

export function captureImageCode(imageVar: string): string {
  return `${captureImageFunctionName}(im2im(${imageVar}, 'pil.rgb_gray').raw_image, "${imageVar}")`;
}
