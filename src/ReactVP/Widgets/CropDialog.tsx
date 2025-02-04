import { useState, useEffect } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { type WidgetProps } from './Widget';

interface ICropDialogProps extends WidgetProps {
  imageUrl: string;
  onClose: () => void;
}

export default function CropDialog({
  imageUrl,
  value,
  setValue,
  forWhom,
  onClose
}: ICropDialogProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: 'px',
    x: value?.[0] ?? 0,
    y: value?.[1] ?? 0,
    width: value?.[2] ?? 0,
    height: value?.[3] ?? 0
  });

  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(
    null
  );

  useEffect(() => {
    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      setImageElement(img);
      // Always set default crop to 80% of image centered
      const width = img.width * 0.8;
      const height = img.height * 0.8;
      const x = (img.width - width) / 2;
      const y = (img.height - height) / 2;
      setCrop({ unit: 'px', x, y, width, height });
    };
  }, [imageUrl]);

  const handleManualInput = (field: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setCrop(prev => ({ ...prev, [field]: numValue }));
  };

  const handleApply = () => {
    // Ensure dimensions are valid and within image bounds
    const dimensions = {
      width: Math.max(1, Math.round(crop.width)),
      height: Math.max(1, Math.round(crop.height))
    };

    setValue?.(forWhom, dimensions);
    onClose();
  };

  return (
    <div className="crop-dialog-overlay">
      <div className="crop-dialog">
        <div className="crop-dialog-header">
          <h3>Crop Image</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="crop-dialog-content">
          <div className="crop-image-container">
            {imageElement && (
              <ReactCrop
                crop={crop}
                onChange={newCrop => setCrop(newCrop)}
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
    </div>
  );
}
