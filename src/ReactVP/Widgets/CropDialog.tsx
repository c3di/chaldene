import { useState, useEffect } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { type WidgetProps } from './Widget';
import { createPortal } from 'react-dom';

interface ICropDialogProps extends WidgetProps {
  imageUrl: string;
  onClose: () => void;
}

const CropDialogPortal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default function CropDialog({
  imageUrl,
  value,
  setValue,
  forWhom,
  onClose
}: ICropDialogProps) {
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
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageElement(img);
      // Set initial crop to 50% of image size, centered
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
    };
  }, [imageUrl]);

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

  return (
    <CropDialogPortal>
      <div
        className="crop-dialog"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="crop-dialog-header">
          <h3>Crop Image</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="crop-dialog-content">
          <div className="crop-image-container">
            {imageElement && (
              <ReactCrop
                crop={crop}
                onChange={newCrop => {
                  // Ensure crop stays within image bounds
                  const constrainedCrop = {
                    ...newCrop,
                    x: Math.max(0, newCrop.x),
                    y: Math.max(0, newCrop.y),
                    width: Math.min(newCrop.width, imageElement?.width ?? 0),
                    height: Math.min(newCrop.height, imageElement?.height ?? 0)
                  };
                  setCrop(constrainedCrop);
                }}
                aspect={undefined}
              >
                <img
                  src={imageUrl}
                  alt="Crop preview"
                  style={{ maxWidth: '100%', maxHeight: '60vh' }}
                />
              </ReactCrop>
            )}
          </div>
          <div className="crop-controls">
            <div className="crop-input-group">
              <label>X:</label>
              <input
                type="number"
                value={Math.round(crop.x)}
                onChange={e => handleManualInput('x', e.target.value)}
              />
            </div>
            <div className="crop-input-group">
              <label>Y:</label>
              <input
                type="number"
                value={Math.round(crop.y)}
                onChange={e => handleManualInput('y', e.target.value)}
              />
            </div>
            <div className="crop-input-group">
              <label>Width:</label>
              <input
                type="number"
                value={Math.round(crop.width)}
                onChange={e => handleManualInput('width', e.target.value)}
              />
            </div>
            <div className="crop-input-group">
              <label>Height:</label>
              <input
                type="number"
                value={Math.round(crop.height)}
                onChange={e => handleManualInput('height', e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="crop-dialog-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleApply}>Apply</button>
        </div>
      </div>
    </CropDialogPortal>
  );
}
