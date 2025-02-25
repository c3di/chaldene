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
    // Start with current crop values
    const newCrop = { ...localCrop };

    // Ensure values stay within image boundaries
    if (imageDimensions) {
      if (field === 'x') {
        // Validate x value
        newCrop.x = Math.max(0, Math.min(newValue, imageDimensions.width));
        // Adjust width if necessary to keep crop within image
        newCrop.width = Math.min(
          newCrop.width,
          imageDimensions.width - newCrop.x
        );
      } else if (field === 'y') {
        // Validate y value
        newCrop.y = Math.max(0, Math.min(newValue, imageDimensions.height));
        // Adjust height if necessary to keep crop within image
        newCrop.height = Math.min(
          newCrop.height,
          imageDimensions.height - newCrop.y
        );
      } else if (field === 'width') {
        // Validate width value based on x position
        const maxWidth = imageDimensions.width - newCrop.x;
        newCrop.width = Math.max(1, Math.min(newValue, maxWidth));
      } else if (field === 'height') {
        // Validate height value based on y position
        const maxHeight = imageDimensions.height - newCrop.y;
        newCrop.height = Math.max(1, Math.min(newValue, maxHeight));
      }
    } else {
      // If no dimensions available, just set the value directly
      newCrop[field] = newValue;
    }

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
            <label>X</label>
            <NumberInput
              forWhom={forWhom}
              value={localCrop.x}
              setValue={(_, val) => handleManualInput('x', val)}
              min={0}
            />
          </div>
          <div className="input-group">
            <label>Y</label>
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
            <label>Width</label>
            <NumberInput
              forWhom={forWhom}
              value={localCrop.width}
              setValue={(_, val) => handleManualInput('width', val)}
              min={1}
            />
          </div>
          <div className="input-group">
            <label>Height</label>
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
