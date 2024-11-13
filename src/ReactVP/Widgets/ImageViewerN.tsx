import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import * as d3Chromatic from 'd3-scale-chromatic';
import { scaleSequential } from 'd3-scale';
import { rgb } from 'd3-color';
import { WidgetProps } from './Widget';

interface IImageViewerProps extends WidgetProps {
  value?: {
    imageUrl: string;
    dimensions?: {
      width: number;
      height: number;
    };
    differences?: number[];
  };
  heatmapOverlay?: boolean;
  isBinary?: boolean;
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

const COLORMAP_OPTIONS = [
  'viridis',
  'inferno',
  'magma',
  'plasma',
  'turbo',
  'cividis',
  'rainbow'
] as const;

type Colormap = (typeof COLORMAP_OPTIONS)[number];

const getColorScale = (colormap: Colormap, minVal: number, maxVal: number) => {
  const interpolator = {
    viridis: d3Chromatic.interpolateViridis,
    inferno: d3Chromatic.interpolateInferno,
    magma: d3Chromatic.interpolateMagma,
    plasma: d3Chromatic.interpolatePlasma,
    turbo: d3Chromatic.interpolateTurbo,
    cividis: d3Chromatic.interpolateCividis,
    rainbow: d3Chromatic.interpolateRainbow
  }[colormap];

  return scaleSequential(interpolator).domain([minVal, maxVal]);
};

// Binary color scale function for -1, 0, 1 values
const getBinaryColorScale = () => {
  return (value: number) => {
    if (value < -0.5) return 'rgba(0, 0, 255, 0.8)';     
    if (value > 0.5) return 'rgba(255, 0, 0, 0.8)';    
    return 'rgba(255, 255, 255, 0.1)';  
  };
};

const generateHeatmap = (
  differences: number[],
  width: number,
  height: number,
  colormap: Colormap,
  isBinary: boolean
): fabric.Image => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const imageData = ctx.createImageData(width, height);

    type ColorMapperFunction = (value: number) => string;
    
    let colorMapper: ColorMapperFunction;
    
    if (isBinary) {
      colorMapper = getBinaryColorScale();
    } else {
      let minVal = differences[0];
      let maxVal = differences[0];
      for (let i = 1; i < differences.length; i++) {
        if (differences[i] < minVal) minVal = differences[i];
        if (differences[i] > maxVal) maxVal = differences[i];
      }
      colorMapper = getColorScale(colormap, minVal, maxVal);
    }

    for (let j = 0, k = 0; j < height; ++j) {
      for (let i = 0; i < width; ++i, ++k) {
        const value = differences[k];
        const colorString = colorMapper(value);
        const color = rgb(colorString);
        
        if (color) {
          const idx = k * 4;
          imageData.data[idx] = color.r;     // R
          imageData.data[idx + 1] = color.g; // G
          imageData.data[idx + 2] = color.b; // B
          
          // Set alpha based on the color's opacity
          if (isBinary) {
            if (Math.abs(value) < 0.5) {
              imageData.data[idx + 3] = 0;  // Fully transparent for values near 0
            } else {
              imageData.data[idx + 3] = 204;  // ~0.8 opacity for differences (204/255 ≈ 0.8)
            }
          } else {
            imageData.data[idx + 3] = 255;  // Full opacity for non-binary
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return new fabric.Image(canvas);
};

export default function ImageViewer({
  value,
  editorContext,
  heatmapOverlay,
  isBinary
}: IImageViewerProps): JSX.Element {
  const canvasElParent = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const [image, setImage] = useState<fabric.FabricImage | null>(null);
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedColormap, setSelectedColormap] = useState<Colormap>('viridis');
  const [lastValidDimensions, setLastValidDimensions] = useState<{width: number, height: number} | null>(null);

  useEffect(() => {
    if (value?.dimensions) {
      setLastValidDimensions(value.dimensions);
    }
  }, [value?.dimensions]);

  
  const updateGlobalTransform = () => {
    if (!editorContext) {
      return;
    }
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
      let zoom = canvas.current!.getZoom();
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

    // Heatmap overlay
    if (showHeatmap && value?.differences) {
      try {
        const heatmapImage = generateHeatmap(
          value.differences,
          image.width,
          image.height,
          selectedColormap,
          isBinary ?? false
        );

        heatmapImage.scaleX = image.width / (heatmapImage.width ?? 1);
        heatmapImage.scaleY = image.height / (heatmapImage.height ?? 1);
        heatmapImage.opacity = isBinary ? 1.0 : 0.3;

        if (canvas.current) {
          canvas.current.overlayImage = heatmapImage;
          canvas.current.renderAll();
        }
      } catch (error) {
        console.error('Failed to process differences data:', error);
      }
    } else {
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
  }, [
    editorContext?.getImageViewTransform(),
    image,
    showHeatmap,
    selectedColormap,
    value?.differences,
    isBinary
  ]);

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        width: '100%', 
        height: '100%',
        gap: '1px',
      }}
    >
      <style>{toggleSwitchStyles}</style>
      
      {lastValidDimensions && (
        <div
          className="nodrag nowheel"
          style={{
            textAlign: 'center',
            fontSize: 'var(--vpl-ui-font-size1)',
            fontFamily: 'var(--vpl-ui-font-family)',
            color: 'var(--vpl-ui-font-color2)',
            minHeight: '14px',
            padding: '2px 0',
            userSelect: 'none',
            pointerEvents: 'none',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {`${lastValidDimensions.width} x ${lastValidDimensions.height}`}
        </div>
      )}

      {/* Main canvas container */}
      <div
        ref={canvasElParent}
        className={'nodrag nowheel widget common-input-style'}
        style={{
          width: '100%',
          flex: 1,
          padding: 0,
          position: 'relative',
          zIndex: 1
        }}
      >
        <canvas
          ref={canvasElement}
          className={`nodrag nowheel widget imageview ${isPanning.current ? 'grabbing' : 'grab'}`}
        />
      </div>

      {lastValidDimensions && heatmapOverlay && (
        <div
          className="nodrag nowheel"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '2px',
            marginBottom: '2px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {!isBinary && (
            <select
              className="nodrag"
              value={selectedColormap}
              onChange={e => setSelectedColormap(e.target.value as Colormap)}
              style={{
                fontSize: 'var(--vpl-ui-font-size1)',
                padding: '2px 4px',
                backgroundColor: 'white',
                border: 'none',
                borderRadius: '2px'
              }}
            >
              {COLORMAP_OPTIONS.map(cm => (
                <option key={cm} value={cm}>
                  {cm}
                </option>
              ))}
            </select>
          )}
          <label className="toggle-switch nodrag">
            <input
              type="checkbox"
              checked={showHeatmap}
              onChange={() => setShowHeatmap(!showHeatmap)}
              className="nodrag"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      )}
    </div>
  );
}
