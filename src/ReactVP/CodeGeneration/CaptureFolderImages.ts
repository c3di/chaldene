const captureFolderImagesFunctionName: string = 'capture_folder_images';

export const FolderImageCaptureDependencies = `
import io as PythonIO
import base64
from pathlib import Path
from PIL import Image
from comm import create_comm

comm = create_comm(target_name='inspection')

def ${captureFolderImagesFunctionName}(folder_path, handleIdentifier):
    # Get all image files in the folder
    image_extensions = {'.jpg', '.jpeg', '.png'}
    image_files = set()  # Use a set to avoid duplicates
    
    try:
        # Convert string path to Path object
        folder = Path(folder_path)
        
        # Get all files with image extensions
        for ext in image_extensions:
            image_files.update(folder.glob(f'*{ext}'))
            image_files.update(folder.glob(f'*{ext.upper()}'))
        
        # Convert to sorted list for consistent ordering
        image_files = sorted(list(image_files))
            
        # Process each image
        images_data = []
        for img_path in image_files:
            try:
                # Open and process image
                with Image.open(img_path) as img:
                    # Convert to RGB if necessary
                    if img.mode not in ['RGB', 'L']:
                        img = img.convert('RGB')
                    
                    # Save to BytesIO
                    buf = PythonIO.BytesIO()
                    img.save(buf, format="PNG")
                    buf.seek(0)
                    
                    # Get dimensions
                    width, height = img.size
                    
                    # Encode to base64
                    image_base64 = base64.b64encode(buf.read()).decode("utf-8")
                    buf.close()
                    
                    # Add to results
                    images_data.append({
                        "imageUrl": f"data:image/png;base64,{image_base64}",
                        "filename": img_path.name,
                        "dimensions": {"width": width, "height": height}
                    })
            except Exception as e:
                continue
        
        # Send the data
        comm.send({
            "handle_id": handleIdentifier,
            "type": "folder",
            "images": images_data
        })
    except Exception as e:
        pass
`;

export function captureFolderImagesCode(
  folderVar: string,
  handleId: string
): string {
  return `${captureFolderImagesFunctionName}(${folderVar}, "${handleId}")`;
}
