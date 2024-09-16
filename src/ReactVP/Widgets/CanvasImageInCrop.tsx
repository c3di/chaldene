import { useEffect, useRef, useState } from 'react';
import { type WidgetProps } from './Widget';

function toSceneCoords(
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: x - rect.left,
    y: y - rect.top
  };
}

function toCanvasCoords(
  x: number,
  y: number,
  canvasScale: number,
  canvasTranslateAfterScale: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: x / canvasScale - canvasTranslateAfterScale.x,
    y: y / canvasScale - canvasTranslateAfterScale.y
  };
}

function drawImageOnCanvas(
  image: HTMLImageElement | null,
  canvas: HTMLCanvasElement | null,
  zoom: number,
  translate: { x: number; y: number }
): void {
  if (canvas && image) {
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    if (ctx) {
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(translate.x, translate.y);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }
}

// todo: the translate is not precise
export interface CanvasImageProps extends WidgetProps {
  value: HTMLImageElement | null;
  zoomable?: boolean;
  translateable?: boolean;
  zoom?: number;
  translate?: { x: number; y: number };
  maxCanvasWidth?: number;
  maxCanvasHeight?: number;
}

export default function CanvasImage({
  value,
  zoomable = true,
  translateable = true,
  zoom: zoomProp,
  translate: TranslsateProp
}: CanvasImageProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isPanning = useRef(false);
  const [zoom, setZoom] = useState(zoomProp ?? 1);
  const [translateAfterScale, setTranslateAfterScale] = useState(
    TranslsateProp ?? { x: 0, y: 0 }
  );

  useEffect(() => {
    if (zoomProp) {
      setZoom(zoomProp);
    }
  }, [zoomProp]);

  useEffect(() => {
    if (TranslsateProp) {
      setTranslateAfterScale(TranslsateProp);
    }
  }, [TranslsateProp]);

  const handleMouseDown = (e: React.MouseEvent): void => {
    isPanning.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (isPanning.current) {
      setTranslateAfterScale(prevTranslate => ({
        x: prevTranslate.x + e.movementX / zoom,
        y: prevTranslate.y + e.movementY / zoom
      }));
    }
  };

  const handleMouseUp = (): void => {
    isPanning.current = false;
  };

  const handleWheel = (e: React.WheelEvent): void => {
    const zoomIntensity = 0.1;
    const newZoom = zoom - (e.deltaY * zoomIntensity) / 100;

    if (newZoom > 0.1 && newZoom < 10) {
      setZoom(newZoom);

      const { x: sceneX, y: sceneY } = toSceneCoords(
        canvasRef.current!,
        e.clientX,
        e.clientY
      );
      const { x: canvasX, y: canvasY } = toCanvasCoords(
        sceneX,
        sceneY,
        zoom,
        translateAfterScale
      );
      const zoomFactor = newZoom / zoom;
      setTranslateAfterScale({
        x: sceneX / zoom - canvasX * zoomFactor,
        y: sceneY / zoom - canvasY * zoomFactor
      });
    }
  };

  useEffect(() => {
    if (!value) {
      return;
    }

    canvasRef.current!.width = value.width;
    canvasRef.current!.height = value.height;

    drawImageOnCanvas(value, canvasRef.current, zoom, translateAfterScale);
  }, [value]);

  useEffect(() => {
    if (!value) {
      return;
    }
    drawImageOnCanvas(value, canvasRef.current, zoom, translateAfterScale);
  }, [zoom, translateAfterScale]);

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
        display: 'block',
        cursor: isPanning ? 'grabbing' : 'grab'
      }}
    />
  );
}
