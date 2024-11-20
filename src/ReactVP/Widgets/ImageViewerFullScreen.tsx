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
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);

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

    //Panning handler
    canvas.on('mouse:down', opt => {
      isPanning.current = true;
      const evt = opt.e as MouseEvent;
      lastPosX.current = evt.clientX;
      lastPosY.current = evt.clientY;
    });

    canvas.on('mouse:move', opt => {
      if (isPanning.current && canvas.viewportTransform) {
        const evt = opt.e as MouseEvent;
        const deltaX = evt.clientX - lastPosX.current;
        const deltaY = evt.clientY - lastPosY.current;

        const viewportTransform = canvas.viewportTransform;
        viewportTransform[4] += deltaX;
        viewportTransform[5] += deltaY;

        lastPosX.current = evt.clientX;
        lastPosY.current = evt.clientY;

        canvas.requestRenderAll();
      }
    });

    canvas.on('mouse:up', () => {
      isPanning.current = false;
    });

    // Zoom handler
    canvas.on('mouse:wheel', opt => {
      const evt = opt.e as WheelEvent;
      const delta = evt.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.05, Math.min(5, zoom));

      const point = new fabric.Point(evt.offsetX, evt.offsetY);

      canvas.zoomToPoint(point, zoom);
      evt.preventDefault();
      evt.stopPropagation();
      canvas.requestRenderAll();
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

        // Heatmap
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
        canvas.requestRenderAll();
      },
      err => {
        console.error('Error loading image:', err);
      }
    );

    // Window resize handler
    const handleResize = () => {
      canvas.setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
      canvas.requestRenderAll();
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
        overflow: 'hidden'
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
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%'
        }}
      >
        <canvas
          ref={canvasRef}
          className={`nodrag nowheel ${isPanning.current ? 'grabbing' : 'grab'}`}
          style={{
            border: 'none'
          }}
        />
      </div>
    </div>,
    document.body
  );
}
