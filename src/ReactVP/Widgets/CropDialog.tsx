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

      // Handle initial crop value setting or defaulting
      if (
        !initialCrop ||
        (initialCrop.width === 0 && initialCrop.height === 0)
      ) {
        // Default centered crop if no initialCrop provided
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
      } else {
        // Ensure initialCrop values are constrained within image boundaries
        const constrainedCrop = {
          unit: 'px' as const,
          x: Math.max(0, Math.min(initialCrop.x, img.width)),
          y: Math.max(0, Math.min(initialCrop.y, img.height)),
          width: Math.max(
            1,
            Math.min(
              initialCrop.width,
              img.width - Math.min(initialCrop.x, img.width)
            )
          ),
          height: Math.max(
            1,
            Math.min(
              initialCrop.height,
              img.height - Math.min(initialCrop.y, img.height)
            )
          )
        };
        setCrop(constrainedCrop);
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

    // Update the output value which will trigger backend processing
    setValue?.(forWhom, cropData);
    onClose();
  };

  const onCropChange = (newCrop: Crop) => {
    // Ensure crop stays within image bounds
    const imgWidth = imageElement?.width ?? 0;
    const imgHeight = imageElement?.height ?? 0;

    const constrainedCrop = {
      ...newCrop,
      x: Math.max(0, newCrop.x),
      y: Math.max(0, newCrop.y),
      width: Math.min(newCrop.width, imgWidth - newCrop.x),
      height: Math.min(newCrop.height, imgHeight - newCrop.y)
    };
    setCrop(constrainedCrop);
  };

  const onCropComplete = (crop: Crop) => {
    // Ensure crop stays within image bounds
    const imgWidth = imageElement?.width ?? 0;
    const imgHeight = imageElement?.height ?? 0;

    const constrainedCrop = {
      ...crop,
      x: Math.max(0, crop.x),
      y: Math.max(0, crop.y),
      width: Math.min(crop.width, imgWidth - crop.x),
      height: Math.min(crop.height, imgHeight - crop.y)
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
