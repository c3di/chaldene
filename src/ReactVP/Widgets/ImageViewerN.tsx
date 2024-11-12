import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';

interface IImageViewerProps extends WidgetProps {
  value?: {
    imageUrl: string;
    dimensions?: {
      width: number;
      height: number;
    };
    heatmap?: string;
  };
  heatmapOverlay?: boolean;
}

const toggleSwitchStyles = `
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 30px;
  height: 16px;
  margin-left: 8px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 16px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #2196F3;
}

input:checked + .toggle-slider:before {
  transform: translateX(14px);
}
`;

const getPointerCoordinates = (e: Event) => {
  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  } else if (e instanceof TouchEvent && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: 0, y: 0 };
};

const generateDummyHeatmap = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) / 2
    );

    gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 255, 0.1)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  console.log('dummy heatmap', canvas.toDataURL('image/png'));
  return canvas.toDataURL('image/png');
};

export default function ImageViewer({
  value,
  editorContext,
  heatmapOverlay
}: IImageViewerProps): JSX.Element {
  const canvasElParent = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const [image, setImage] = useState<fabric.FabricImage | null>(null);
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const updateGlobalTransform = () => {
    if (!editorContext) {
      return;
    }
    // todo: push to update all re-render?
    const viewportTransform = canvas.current!.viewportTransform;
    editorContext.updateGlobalTransform({
      x: viewportTransform[4],
      y: viewportTransform[5],
      zoom: canvas.current?.getZoom() ?? 1
    });
  };

  const updateLastPox = (x: number, y: number) => {
    lastPosX.current = x;
    lastPosY.current = y;
    updateGlobalTransform();
  };

  function resizeCanvas() {
    const parent = canvasElParent.current;
    canvas.current?.setDimensions({
      width: parent?.clientWidth ?? 0,
      height: parent?.clientHeight ?? 0
    });
    canvas.current?.renderAll();
  }

  useEffect(() => {
    if (!canvasElement.current || !canvasElParent.current) {
      return;
    }
    canvas.current = new fabric.Canvas(canvasElement.current, {
      selection: false
    });

    canvas.current.on('mouse:down', opt => {
      isPanning.current = true;
      const { x, y } = getPointerCoordinates(opt.e);
      updateLastPox(x, y);
    });

    canvas.current.on('mouse:move', opt => {
      if (isPanning.current && canvas.current) {
        const viewportTransform = canvas.current!.viewportTransform;
        const { x, y } = getPointerCoordinates(opt.e);
        viewportTransform[4] += x - lastPosX.current;
        viewportTransform[5] += y - lastPosY.current;
        canvas.current?.renderAll();
        updateLastPox(x, y);
      }
    });

    canvas.current.on('mouse:up', () => {
      isPanning.current = false;
    });

    canvas.current.on('mouse:wheel', opt => {
      if (!canvas.current) {
        return;
      }
      const delta = opt.e.deltaY;
      let zoom = canvas.current.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.05, zoom);
      zoom = Math.min(5, zoom);
      const deltaPoint = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
      canvas.current.zoomToPoint(deltaPoint, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      updateGlobalTransform();
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      canvas.current?.dispose();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (!canvas.current || !value?.imageUrl) {
      return;
    }
    canvas.current.clear();
    fabric.FabricImage.fromURL(value.imageUrl)
      .then((img: fabric.Image) => {
        if (canvas.current?.backgroundImage === img) {
          return;
        }
        setImage(img);
      })
      .catch(err => {
        console.error('Failed to load image', err);
      });
  }, [value?.imageUrl]);

  useEffect(() => {
    if (!canvas.current || !image) {
      return;
    }
    const {
      x: asyncX,
      y: asyncY,
      zoom: asyncZoom
    } = editorContext?.getImageViewTransform() ?? {};

    const scaleFactor =
      asyncZoom ??
      Math.min(
        canvas.current!.width / image.width,
        canvas.current!.height / image.height
      );
    canvas.current!.setZoom(scaleFactor);

    // Set background image
    canvas.current!.backgroundImage = image;

    // Handle heatmap overlay
    if (showHeatmap) {
      // Use actual heatmap if available, otherwise use dummy heatmap
      const heatmapUrl =
        value?.heatmap ?? generateDummyHeatmap(image.width, image.height);

      fabric.FabricImage.fromURL(heatmapUrl).then((img: fabric.Image) => {
        // Set the overlay image with the same dimensions as the background
        img.scaleX = image.width / (img.width ?? 1);
        img.scaleY = image.height / (img.height ?? 1);
        img.opacity = 0.5;

        // Use overlayImage property
        if (canvas.current) {
          canvas.current.overlayImage = img;
          canvas.current.renderAll();
        }
      });
    } else {
      // Clear overlay if heatmap is toggled off
      if (canvas.current) {
        canvas.current.overlayImage = undefined;
        canvas.current.renderAll();
      }
    }

    const zoom = canvas.current!.getZoom();
    const viewportTransform = canvas.current!.viewportTransform;

    // Calculate the translation to center the image
    const centerX = (canvas.current!.width - image.width * zoom) / 2;
    const centerY = (canvas.current!.height - image.height * zoom) / 2;

    if (viewportTransform) {
      viewportTransform[4] = asyncX ?? centerX;
      viewportTransform[5] = asyncY ?? centerY;
    }

    canvas.current!.renderAll();
  }, [editorContext?.getImageViewTransform(), image, showHeatmap]);

  return (
    <div>
      <style>{toggleSwitchStyles}</style>
      <div
        ref={canvasElParent}
        className={'nodrag nowheel widget common-input-style'}
        style={{
          width: '100%',
          height: '100%',
          padding: 0
        }}
      >
        <canvas
          ref={canvasElement}
          className={`nodrag nowheel widget imageview ${isPanning.current ? 'grabbing' : 'grab'}`}
        />
      </div>
      {value?.dimensions && (
        <div
          style={{
            position: 'relative',
            width: '100%'
          }}
        >
          <div
            className="image-info"
            style={{
              marginBottom: '0px',
              textAlign: 'center',
              fontSize: 'var(--vpl-ui-font-size1)',
              fontFamily: 'var(--vpl-ui-font-family)',
              color: 'var(--vpl-ui-font-color2)'
            }}
          >
            <span>
              {`${value.dimensions.width} x ${value.dimensions.height}`}
            </span>
            {heatmapOverlay && (
              <div
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '80%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={showHeatmap}
                    onChange={() => setShowHeatmap(!showHeatmap)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
