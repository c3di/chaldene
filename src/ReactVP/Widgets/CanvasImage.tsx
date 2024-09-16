import React, { useEffect, useRef, useCallback } from 'react';
import { type WidgetProps } from './Widget';

function SizeFitToImage(
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
): { width: number; height: number } {
  const imageAspectRatio = image.width / image.height;

  let newCanvasWidth = canvasWidth;
  let newCanvasHeight = canvasHeight;

  if (canvasWidth / imageAspectRatio > canvasHeight) {
    newCanvasWidth = canvasHeight * imageAspectRatio;
  } else {
    newCanvasHeight = canvasWidth / imageAspectRatio;
  }

  return { width: newCanvasWidth, height: newCanvasHeight };
}

function drawImageOnCanvas(
  image: HTMLImageElement | null,
  canvas: HTMLCanvasElement | null,
  zoom: number,
  translate: { x: number; y: number }
): void {
  if (canvas && image) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(translate.x, translate.y);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }
}

function toCanvasCoords(
  x: number,
  y: number,
  canvasScale: number,
  canvasTranslate: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: x / canvasScale - canvasTranslate.x,
    y: y / canvasScale - canvasTranslate.y
  };
}

export interface CanvasImageProps extends WidgetProps {
  value: HTMLImageElement | null;
  zoomable?: boolean;
  translateable?: boolean;
  zoom: number;
  translate: { x: number; y: number };
  maxCanvasWidth?: number;
  maxCanvasHeight?: number;
  resetTrigger?: number;
  onZoomChange: (zoom: number) => void;
  onTranslateChange: (translate: { x: number; y: number }) => void;
}

export default function CanvasImage({
  value,
  zoomable = true,
  translateable = true,
  zoom,
  translate,
  maxCanvasWidth,
  maxCanvasHeight,
  resetTrigger,
  onZoomChange,
  onTranslateChange
}: CanvasImageProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPanning = useRef(false);

  const updateCanvas = useCallback(() => {
    drawImageOnCanvas(value, canvasRef.current, zoom, translate);
  }, [value, zoom, translate]);

  const initializeCanvas = useCallback(() => {
    if (!value || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (maxCanvasWidth && maxCanvasHeight) {
      const { width, height } = SizeFitToImage(
        value,
        maxCanvasWidth,
        maxCanvasHeight
      );
      canvas.width = width;
      canvas.height = height;
    }

    onZoomChange(1);
    onTranslateChange({ x: 0, y: 0 });
  }, [value, maxCanvasWidth, maxCanvasHeight, onZoomChange, onTranslateChange]);

  useEffect(() => {
    initializeCanvas();
  }, [initializeCanvas]);

  useEffect(() => {
    updateCanvas();
  }, [updateCanvas]);

  useEffect(() => {
    if (resetTrigger) {
      onZoomChange(1);
      onTranslateChange({ x: 0, y: 0 });
    }
  }, [resetTrigger, onZoomChange, onTranslateChange]);

  const handleMouseDown = useCallback(() => {
    isPanning.current = true;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning.current) {
        const newTranslate = {
          x: translate.x + e.movementX / zoom,
          y: translate.y + e.movementY / zoom
        };
        onTranslateChange(newTranslate);
      }
    },
    [translate, zoom, onTranslateChange]
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const zoomIntensity = 0.1;
      const newZoom = zoom * (1 - (e.deltaY * zoomIntensity) / 100);

      if (newZoom > 0.1 && newZoom < 10) {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const { x: canvasX, y: canvasY } = toCanvasCoords(
          mouseX,
          mouseY,
          zoom,
          translate
        );

        const newTranslate = {
          x: mouseX / newZoom - canvasX,
          y: mouseY / newZoom - canvasY
        };

        onZoomChange(newZoom);
        onTranslateChange(newTranslate);
      }
    },
    [zoom, translate, onZoomChange, onTranslateChange]
  );

  return (
    <canvas
      onMouseDown={translateable ? handleMouseDown : undefined}
      onMouseMove={translateable ? handleMouseMove : undefined}
      onMouseUp={translateable ? handleMouseUp : undefined}
      onMouseLeave={translateable ? handleMouseUp : undefined}
      onWheel={zoomable ? handleWheel : undefined}
      className={`nodrag ${zoomable ? 'nowheel' : ''}`}
      ref={canvasRef}
      style={{
        border: '1px solid #ccc',
        maxWidth: '100%',
        maxHeight: '100%',
        display: 'block',
        cursor: isPanning.current ? 'grabbing' : 'grab'
      }}
    />
  );
}
