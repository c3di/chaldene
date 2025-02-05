import { useState } from 'react';
import { type WidgetProps } from './Widget';
import CropDialog from './CropDialog';

interface IImageCropperWidgetProps extends WidgetProps {
  imageUrl?: string;
}

export default function ImageCropper({
  forWhom,
  value,
  setValue,
  editorContext
}: IImageCropperWidgetProps): JSX.Element {
  const [showCropDialog, setShowCropDialog] = useState(false);

  const getConnectedImageUrl = () => {
    if (!editorContext?.graph || !forWhom) {
      return '';
    }

    const edge = editorContext.graph.edges.find(
      e => e.target === forWhom.nodeID && e.targetHandle === 'in0'
    );

    if (!edge) {
      return '';
    }

    const sourceNode = editorContext.graph.nodes.find(
      n => n.id === edge.source
    );
    const sourceOutput = sourceNode?.data.outputs?.find(
      o => o.id === edge.sourceHandle
    );

    return sourceOutput?.widget?.value?.imageUrl ?? '';
  };

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

      {showCropDialog && (
        <CropDialog
          imageUrl={getConnectedImageUrl()}
          value={value}
          setValue={(_, newDimensions) => {
            if (newDimensions && Array.isArray(newDimensions)) {
              setValue?.(forWhom, newDimensions);
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
