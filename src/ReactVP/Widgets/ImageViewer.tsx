import { useEffect, useState, useCallback } from 'react';
import { type WidgetProps } from './Widget';
import CanvasImage from './CanvasImage';

export interface ImageViewerProps extends WidgetProps {
  value: string; // base64 image
}

export default function ImageViewer({ value }: WidgetProps): JSX.Element {
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [resetTrigger, setResetTrigger] = useState(0);

  useEffect(() => {
    const imageToDraw = new Image();
    imageToDraw.onload = () => {
      setImage(imageToDraw);
    };
    imageToDraw.src = value;
  }, [value]);

  const handleReset = useCallback((): void => {
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
    setResetTrigger(prev => prev + 1);
  }, []);

  const handleZoomChange = useCallback((newZoom: number): void => {
    setZoom(newZoom);
  }, []);

  const handleTranslateChange = useCallback(
    (newTranslate: { x: number; y: number }): void => {
      setTranslate(newTranslate);
    },
    []
  );

  return (
    <div
      className="common-input-style"
      style={{ padding: 0, height: 'auto', marginBottom: '8px' }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <CanvasImage
          value={image}
          zoom={zoom}
          translate={translate}
          maxCanvasHeight={256}
          maxCanvasWidth={(256 * 16) / 9}
          onZoomChange={handleZoomChange}
          onTranslateChange={handleTranslateChange}
          resetTrigger={resetTrigger}
        />
        <button
          onClick={handleReset}
          style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '3px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Reset"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="0.1"
          >
            <circle cx="12" cy="12" r="10" fill="rgba(0,0,0,0.5)" />

            <path
              d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
              fill="white"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
