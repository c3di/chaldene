import { useState, useEffect } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { type WidgetProps } from './Widget';
import { createPortal } from 'react-dom';
import { NumberInput } from './Input';

interface ICropDialogProps extends WidgetProps {
  imageUrl: string;
  onClose: () => void;
  initialCrop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const CropDialogPortal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(
    <div className="crop-dialog-overlay">{children}</div>,
    document.body
  );
};

export default function CropDialog({
  imageUrl,
  value,
  setValue,
  forWhom,
  onClose,
  initialCrop
}: ICropDialogProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: 'px',
    x: initialCrop?.x ?? value?.[0] ?? 0,
    y: initialCrop?.y ?? value?.[1] ?? 0,
    width: initialCrop?.width ?? value?.[2] ?? 0,
    height: initialCrop?.height ?? value?.[3] ?? 0
  });

  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null
  );

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageElement(img);

      // Only set default centered crop if no initialCrop is provided
      if (
        !initialCrop ||
        (initialCrop.width === 0 && initialCrop.height === 0)
      ) {
        const width = Math.min(img.width * 0.5, img.width);
        const height = Math.min(img.height * 0.5, img.height);
        const x = Math.max(0, (img.width - width) / 2);
        const y = Math.max(0, (img.height - height) / 2);
        setCrop({
          unit: 'px',
          x,
          y,
          width,
          height
        });
      }
    };
  }, [imageUrl, initialCrop]);

  const handleManualInput = (field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setCrop(prev => ({ ...prev, [field]: numValue }));
  };

  const handleApply = () => {
    // Pass crop coordinates as tuple4 [x, y, width, height]
    const cropData = [
      Math.round(crop.x),
      Math.round(crop.y),
      Math.max(1, Math.round(crop.width)),
      Math.max(1, Math.round(crop.height))
    ];

    console.log('CropDialog - Before setValue:', {
      cropData,
      forWhom
    });

    // Update the output value which will trigger backend processing
    setValue?.(forWhom, cropData);
    onClose();
  };

  const onCropChange = (newCrop: Crop) => {
    // Ensure crop stays within image bounds
    const constrainedCrop = {
      ...newCrop,
      x: Math.max(0, newCrop.x),
      y: Math.max(0, newCrop.y),
      width: Math.min(newCrop.width, imageElement?.width ?? 0),
      height: Math.min(newCrop.height, imageElement?.height ?? 0)
    };
    setCrop(constrainedCrop);
  };

  const onCropComplete = (crop: Crop) => {
    // Ensure crop stays within image bounds
    const constrainedCrop = {
      ...crop,
      x: Math.max(0, crop.x),
      y: Math.max(0, crop.y),
      width: Math.min(crop.width, imageElement?.width ?? 0),
      height: Math.min(crop.height, imageElement?.height ?? 0)
    };
    setCrop(constrainedCrop);
  };

  return (
    <CropDialogPortal>
      <div className="crop-dialog">
        <div className="crop-dialog-content">
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

          <div className="crop-inputs">
            <div className="input-row">
              <div className="input-group">
                <label>X</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.x)}
                  setValue={(_, val) => handleManualInput('x', val.toString())}
                  min={0}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.y)}
                  setValue={(_, val) => handleManualInput('y', val.toString())}
                  min={0}
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Width</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.width)}
                  setValue={(_, val) =>
                    handleManualInput('width', val.toString())
                  }
                  min={1}
                />
              </div>
              <div className="input-group">
                <label>Height</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.height)}
                  setValue={(_, val) =>
                    handleManualInput('height', val.toString())
                  }
                  min={1}
                />
              </div>
            </div>
          </div>

          <div className="crop-dialog-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="apply-button" onClick={handleApply}>
              Apply
            </button>
          </div>
        </div>
      </div>
    </CropDialogPortal>
  );
}
