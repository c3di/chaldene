import { useState, useEffect } from 'react';
import { type WidgetProps } from './Widget';
import CropDialog from './CropDialog';
import { NumberInput } from './Input';

interface IImageCropperWidgetProps extends WidgetProps {
  value?: number[];
  imageUrl?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export default function ImageCropper({
  forWhom,
  value,
  setValue,
  editorContext,
  imageUrl = '',
  dimensions
}: IImageCropperWidgetProps): JSX.Element {
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<
    { width: number; height: number } | undefined
  >();

  // Initialize dimensions when inspection data changes
  useEffect(() => {
    if (dimensions) {
      setImageDimensions(dimensions);
      if (!value || value[2] === 0 || value[3] === 0) {
        const cropData = [0, 0, dimensions.width, dimensions.height];
        setValue?.(forWhom, cropData);
        if (editorContext?.graph) {
          editorContext.updateGraph(editorContext.graph);
        }
      }
    }
  }, [dimensions]);

  const [localCrop, setLocalCrop] = useState({
    x: value?.[0] ?? 0,
    y: value?.[1] ?? 0,
    width: value?.[2] ?? imageDimensions?.width ?? 0,
    height: value?.[3] ?? imageDimensions?.height ?? 0
  });

  const handleManualInput = (
    field: keyof typeof localCrop,
    newValue: number
  ) => {
    const newCrop = { ...localCrop, [field]: newValue };
    setLocalCrop(newCrop);

    // Update the value in the graph
    const cropData = [newCrop.x, newCrop.y, newCrop.width, newCrop.height];
    setValue?.(forWhom, cropData);
    if (editorContext?.graph) {
      editorContext.updateGraph(editorContext.graph);
    }
  };

  // Update localCrop when value or dimensions change
  useEffect(() => {
    if (value && Array.isArray(value)) {
      setLocalCrop({
        x: value[0] ?? 0,
        y: value[1] ?? 0,
        width: value[2] ?? imageDimensions?.width ?? 0,
        height: value[3] ?? imageDimensions?.height ?? 0
      });
    } else if (imageDimensions) {
      setLocalCrop({
        x: 0,
        y: 0,
        width: imageDimensions.width,
        height: imageDimensions.height
      });
    }
  }, [value, imageDimensions]);

  return (
    <div className="crop-input-container widget">
      <button
        className="crop-input-button"
        title="Open crop dialog"
        onClick={() => setShowCropDialog(true)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="currentColor"
        >
          <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z" />
        </svg>
      </button>

      <div className="crop-inputs">
        <div className="input-row">
          <div className="input-group">
            <label>X:</label>
            <NumberInput
              forWhom={forWhom}
              value={localCrop.x}
              setValue={(_, val) => handleManualInput('x', val)}
              min={0}
            />
          </div>
          <div className="input-group">
            <label>Y:</label>
            <NumberInput
              forWhom={forWhom}
              value={localCrop.y}
              setValue={(_, val) => handleManualInput('y', val)}
              min={0}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Width:</label>
            <NumberInput
              forWhom={forWhom}
              value={localCrop.width}
              setValue={(_, val) => handleManualInput('width', val)}
              min={1}
            />
          </div>
          <div className="input-group">
            <label>Height:</label>
            <NumberInput
              forWhom={forWhom}
              value={localCrop.height}
              setValue={(_, val) => handleManualInput('height', val)}
              min={1}
            />
          </div>
        </div>
      </div>

      {showCropDialog && (
        <CropDialog
          imageUrl={imageUrl}
          value={value}
          initialCrop={localCrop}
          setValue={(_, newDimensions) => {
            if (newDimensions && Array.isArray(newDimensions)) {
              setValue?.(forWhom, newDimensions);
              setLocalCrop({
                x: newDimensions[0],
                y: newDimensions[1],
                width: newDimensions[2],
                height: newDimensions[3]
              });
              if (editorContext?.graph) {
                editorContext.updateGraph(editorContext.graph);
              }
            }
          }}
          forWhom={forWhom}
          onClose={() => setShowCropDialog(false)}
        />
      )}
    </div>
  );
}
