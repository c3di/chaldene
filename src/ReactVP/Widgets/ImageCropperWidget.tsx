import { useState, useEffect } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { type WidgetProps } from './Widget';
import { type IHandleIdentifier } from '../Type';

interface ImageCropperWidgetProps extends WidgetProps {
  value?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  setValue?: (identifier?: IHandleIdentifier, value?: any) => void;
  forWhom?: IHandleIdentifier;
  imageUrl?: string;
}

export default function ImageCropperWidget({
  value,
  setValue,
  forWhom,
  imageUrl,
  editorContext
}: ImageCropperWidgetProps) {
  console.log('ImageCropperWidget props:', {
    value,
    forWhom,
    imageUrl,
    hasEditorContext: !!editorContext
  });

  const [crop, setCrop] = useState<Crop>({
    unit: 'px',
    x: value?.x ?? 0,
    y: value?.y ?? 0,
    width: value?.width ?? 0,
    height: value?.height ?? 0
  });

  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null
  );

  useEffect(() => {
    console.log('ImageUrl changed:', imageUrl);
    if (!imageUrl) {
      return;
    }

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      console.log('Image loaded:', {
        width: img.width,
        height: img.height
      });
      setImageElement(img);

      // Set initial crop to center 80% of image if no crop exists
      if (!value?.width) {
        const width = img.width * 0.8;
        const height = img.height * 0.8;
        const x = (img.width - width) / 2;
        const y = (img.height - height) / 2;

        console.log('Setting initial crop:', { x, y, width, height });
        setCrop({ unit: 'px', x, y, width, height });
        if (forWhom && setValue) {
          setValue(forWhom, { x, y, width, height });
        }
      }
    };
    img.onerror = error => {
      console.error('Error loading image:', error);
    };
  }, [imageUrl]);

  const onCropChange = (newCrop: Crop) => {
    setCrop(newCrop);
  };

  const onCropComplete = (crop: Crop) => {
    if (forWhom && setValue) {
      setValue(forWhom, {
        x: Math.round(crop.x),
        y: Math.round(crop.y),
        width: Math.round(crop.width),
        height: Math.round(crop.height)
      });
    }
  };

  if (!imageElement || !imageUrl) {
    return <div>No image loaded</div>;
  }

  return (
    <div className="image-cropper-container">
      <ReactCrop
        crop={crop}
        onChange={onCropChange}
        onComplete={onCropComplete}
        aspect={undefined}
      >
        <img
          src={imageUrl}
          alt="Crop preview"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </ReactCrop>
    </div>
  );
}
