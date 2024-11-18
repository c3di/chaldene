import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import ReactDOM from 'react-dom';
import { generateHeatmap, Colormap } from './heatmapUtils';

interface IImageViewerFullScreenProps {
  imageUrl?: string;
  onClose: () => void;
  showHeatmap?: boolean;
  differences?: number[];
  selectedColormap?: Colormap;
  isBinary?: boolean;
}

export function ImageViewerFullScreen({
  imageUrl,
  onClose,
  showHeatmap,
  differences,
  selectedColormap = 'viridis',
  isBinary = false
}: IImageViewerFullScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !imageUrl) {
      console.log('Missing canvas ref or imageUrl');
      return;
    }

    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      selection: false
    });

    const canvas = fabricCanvasRef.current;

    canvas.setDimensions({
      width: window.innerWidth,
      height: window.innerHeight
    });

    // Load and display base image
    fabric.Image.fromURL(imageUrl).then(
      (img: fabric.Image) => {
        const scale = Math.min(
          window.innerWidth / img.width!,
          window.innerHeight / img.height!
        );

        img.scale(scale);
        img.set({
          left: canvas.width! / 2,
          top: canvas.height! / 2,
          originX: 'center',
          originY: 'center'
        });

        canvas.backgroundImage = img;

        // If heatmap is enabled, add it as overlay
        if (showHeatmap && differences) {
          const heatmapImage = generateHeatmap(
            differences,
            img.width!,
            img.height!,
            selectedColormap,
            isBinary
          );

          heatmapImage.scale(scale);
          heatmapImage.set({
            left: canvas.width! / 2,
            top: canvas.height! / 2,
            originX: 'center',
            originY: 'center',
            opacity: isBinary ? 1.0 : 0.3
          });

          canvas.overlayImage = heatmapImage;
        }
        canvas.renderAll();
      },
      err => {
        console.error('Error loading image:', err);
      }
    );

    // Add resize handler
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [imageUrl, showHeatmap, differences, selectedColormap, isBinary]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          zIndex: 10000
        }}
      >
        ✕
      </button>
      <canvas
        ref={canvasRef}
        style={{
          border: 'none'
        }}
      />
    </div>,
    document.body
  );
}
