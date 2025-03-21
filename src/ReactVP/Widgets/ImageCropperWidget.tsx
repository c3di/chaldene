import { useState, useEffect, useCallback } from 'react';
import { type WidgetProps } from './Widget';
import CropDialog from './CropDialog';
import { NumberInput } from './Input';

// Constants for crop array indices to improve readability
export const CROP_X = 0;
export const CROP_Y = 1;
export const CROP_WIDTH = 2;
export const CROP_HEIGHT = 3;

// Utility function to constrain crop values within image boundaries
export function constrainCropToImage(
  crop: number[],
  imageWidth: number,
  imageHeight: number
): number[] {
  const x = Math.max(0, Math.min(crop[CROP_X], imageWidth));
  const y = Math.max(0, Math.min(crop[CROP_Y], imageHeight));
  const width = Math.max(1, Math.min(crop[CROP_WIDTH], imageWidth - x));
  const height = Math.max(1, Math.min(crop[CROP_HEIGHT], imageHeight - y));

  return [x, y, width, height];
}

// Create a default crop array with the given dimensions
export function createDefaultCrop(width: number, height: number): number[] {
  return [0, 0, width, height];
}

interface IImageCropperWidgetProps extends WidgetProps {
  value?: number[];
  imageUrl?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

// Add debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
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

  // State for input field values - used ONLY for rendering
  const [inputValues, setInputValues] = useState<number[]>([0, 0, 0, 0]);

  // Initialize dimensions when inspection data changes
  useEffect(() => {
    if (dimensions) {
      setImageDimensions(dimensions);
      if (!value || value[CROP_WIDTH] === 0 || value[CROP_HEIGHT] === 0) {
        const defaultCrop = constrainCropToImage(
          [0, 0, dimensions.width, dimensions.height],
          dimensions.width,
          dimensions.height
        );
        setValue?.(forWhom, defaultCrop);
        if (editorContext?.graph) {
          editorContext.updateGraph(editorContext.graph);
        }
      }
    }
  }, [dimensions, value]);

  // Update input values when value changes
  useEffect(() => {
    if (value && Array.isArray(value)) {
      setInputValues([...value]);
    } else if (imageDimensions) {
      setInputValues([0, 0, imageDimensions.width, imageDimensions.height]);
    }
  }, [value, imageDimensions]);

  // Update graph with changes
  const updateGraphWithCrop = useCallback(
    (crop: number[]) => {
      setValue?.(forWhom, crop);
      if (editorContext?.graph) {
        editorContext.updateGraph(editorContext.graph);
      }
    },
    [forWhom, setValue]
  );

  // Handle manual input changes
  const handleManualInput = useCallback(
    (index: number, newValue: number) => {
      // Update the input value immediately for rendering
      const newInputValues = [...inputValues];
      newInputValues[index] = newValue;
      setInputValues(newInputValues);

      // Create constrained crop data
      let constrainedCrop = [...newInputValues];
      if (imageDimensions) {
        constrainedCrop = constrainCropToImage(
          newInputValues,
          imageDimensions.width,
          imageDimensions.height
        );
      }

      // Debounce the actual update to the graph
      debounce(() => {
        updateGraphWithCrop(constrainedCrop);
      }, 100)();
    },
    [inputValues, imageDimensions, updateGraphWithCrop]
  );

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
              value={inputValues[CROP_X]}
              setValue={(_, val) => handleManualInput(CROP_X, val)}
              min={0}
            />
          </div>
          <div className="input-group">
            <label>Y</label>
            <NumberInput
              forWhom={forWhom}
              value={inputValues[CROP_Y]}
              setValue={(_, val) => handleManualInput(CROP_Y, val)}
              min={0}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Width</label>
            <NumberInput
              forWhom={forWhom}
              value={inputValues[CROP_WIDTH]}
              setValue={(_, val) => handleManualInput(CROP_WIDTH, val)}
              min={1}
            />
          </div>
          <div className="input-group">
            <label>Height</label>
            <NumberInput
              forWhom={forWhom}
              value={inputValues[CROP_HEIGHT]}
              setValue={(_, val) => handleManualInput(CROP_HEIGHT, val)}
              min={1}
            />
          </div>
        </div>
      </div>

      {showCropDialog && (
        <CropDialog
          imageUrl={imageUrl}
          value={value}
          initialCrop={value}
          setValue={(_, newDimensions) => {
            if (newDimensions && Array.isArray(newDimensions)) {
              setValue?.(forWhom, newDimensions);
              setInputValues(newDimensions);
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
