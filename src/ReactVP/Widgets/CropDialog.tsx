import { useState, useEffect, useCallback, useMemo } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { type WidgetProps } from './Widget';
import { createPortal } from 'react-dom';
import { NumberInput } from './Input';
import {
  constrainCropToImage,
  CROP_X,
  CROP_Y,
  CROP_WIDTH,
  CROP_HEIGHT
} from './ImageCropperWidget';

interface ICropDialogProps extends WidgetProps {
  imageUrl: string;
  onClose: () => void;
  initialCrop?: number[];
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
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null
  );
  const [imageLoaded, setImageLoaded] = useState(false);

  const initialCropState = useMemo(() => {
    const cropArray = initialCrop || value || [0, 0, 0, 0];
    return {
      unit: 'px' as const,
      x: cropArray[CROP_X],
      y: cropArray[CROP_Y],
      width: cropArray[CROP_WIDTH],
      height: cropArray[CROP_HEIGHT]
    };
  }, [initialCrop, value]);

  const [crop, setCrop] = useState<Crop>(initialCropState);

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageElement(img);
      setImageLoaded(true);

      if (
        !initialCrop ||
        (initialCrop[CROP_WIDTH] === 0 && initialCrop[CROP_HEIGHT] === 0)
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
        const constrainedCrop = constrainCropToImage(
          initialCrop,
          img.width,
          img.height
        );

        setCrop({
          unit: 'px',
          x: constrainedCrop[CROP_X],
          y: constrainedCrop[CROP_Y],
          width: constrainedCrop[CROP_WIDTH],
          height: constrainedCrop[CROP_HEIGHT]
        });
      }
    };
  }, [imageUrl, initialCrop]);

  const handleManualInput = useCallback(
    (index: number, newValue: number) => {
      if (!imageElement) {
        return;
      }

      // Create an updated crop array
      const cropArray = [
        index === CROP_X ? newValue : Math.round(crop.x),
        index === CROP_Y ? newValue : Math.round(crop.y),
        index === CROP_WIDTH ? newValue : Math.round(crop.width),
        index === CROP_HEIGHT ? newValue : Math.round(crop.height)
      ];

      // Constrain the crop to the image boundaries
      const constrainedCrop = constrainCropToImage(
        cropArray,
        imageElement.width,
        imageElement.height
      );

      // Update UI immediately with the new values
      setCrop(prevCrop => ({
        ...prevCrop,
        x: constrainedCrop[CROP_X],
        y: constrainedCrop[CROP_Y],
        width: constrainedCrop[CROP_WIDTH],
        height: constrainedCrop[CROP_HEIGHT]
      }));
    },
    [crop, imageElement]
  );

  const handleApply = useCallback(() => {
    // Convert crop to array format with rounded values
    const cropData = [
      Math.round(crop.x),
      Math.round(crop.y),
      Math.max(1, Math.round(crop.width)),
      Math.max(1, Math.round(crop.height))
    ];

    // Update the output value which will trigger backend processing
    setValue?.(forWhom, cropData);
    onClose();
  }, [crop, forWhom, onClose, setValue]);

  const onCropChange = useCallback(
    (newCrop: Crop) => {
      if (!imageElement) {
        return;
      }

      // Convert ReactCrop's crop to our array format
      const cropArray = [newCrop.x, newCrop.y, newCrop.width, newCrop.height];

      // Ensure crop stays within image bounds using our shared utility
      const constrainedCrop = constrainCropToImage(
        cropArray,
        imageElement.width,
        imageElement.height
      );

      setCrop({
        ...newCrop,
        x: constrainedCrop[CROP_X],
        y: constrainedCrop[CROP_Y],
        width: constrainedCrop[CROP_WIDTH],
        height: constrainedCrop[CROP_HEIGHT]
      });
    },
    [imageElement]
  );

  return (
    <CropDialogPortal>
      <div className="crop-dialog">
        <div className="crop-dialog-content">
          {!imageLoaded && (
            <div className="image-loading">Loading image...</div>
          )}

          {imageLoaded && (
            <ReactCrop
              crop={crop}
              onChange={onCropChange}
              onComplete={onCropChange}
              aspect={undefined}
            >
              <img
                src={imageUrl}
                alt="Crop preview"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </ReactCrop>
          )}

          <div className="crop-inputs">
            <div className="input-row">
              <div className="input-group">
                <label>X</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.x)}
                  setValue={(_, val) => handleManualInput(CROP_X, val)}
                  min={0}
                  disabled={!imageLoaded}
                />
              </div>
              <div className="input-group">
                <label>Y</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.y)}
                  setValue={(_, val) => handleManualInput(CROP_Y, val)}
                  min={0}
                  disabled={!imageLoaded}
                />
              </div>
            </div>
            <div className="input-row">
              <div className="input-group">
                <label>Width</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.width)}
                  setValue={(_, val) => handleManualInput(CROP_WIDTH, val)}
                  min={1}
                  disabled={!imageLoaded}
                />
              </div>
              <div className="input-group">
                <label>Height</label>
                <NumberInput
                  forWhom={forWhom}
                  value={Math.round(crop.height)}
                  setValue={(_, val) => handleManualInput(CROP_HEIGHT, val)}
                  min={1}
                  disabled={!imageLoaded}
                />
              </div>
            </div>
          </div>

          <div className="crop-dialog-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="apply-button"
              onClick={handleApply}
              disabled={!imageLoaded}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </CropDialogPortal>
  );
}
