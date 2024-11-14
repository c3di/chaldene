import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import * as d3Chromatic from 'd3-scale-chromatic';
import { scaleSequential } from 'd3-scale';
import { rgb } from 'd3-color';
import { WidgetProps } from './Widget';
import { Dropdown } from './Input';

const HEATMAP_ICON_PATH =
  'data:image/png;base64,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';

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
    rainbow: d3Chromatic.interpolateRainbow
  }[colormap];

  return scaleSequential(interpolator).domain([minVal, maxVal]);
};

// Binary color scale function for -1, 0, 1 values
const getBinaryColorScale = () => {
  return (value: number) => {
    if (value < -0.5) {
      return 'rgba(0, 0, 255, 0.8)';
    }
    if (value > 0.5) {
      return 'rgba(255, 0, 0, 0.8)';
    }
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
        if (differences[i] < minVal) {
          minVal = differences[i];
        }
        if (differences[i] > maxVal) {
          maxVal = differences[i];
        }
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
          imageData.data[idx] = color.r; // R
          imageData.data[idx + 1] = color.g; // G
          imageData.data[idx + 2] = color.b; // B

          // Set alpha based on the color's opacity
          if (isBinary) {
            if (Math.abs(value) < 0.5) {
              imageData.data[idx + 3] = 0; // Fully transparent for values near 0
            } else {
              imageData.data[idx + 3] = 204; // ~0.8 opacity for differences (204/255 ≈ 0.8)
            }
          } else {
            imageData.data[idx + 3] = 255; // Full opacity for non-binary
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
  const [lastValidDimensions, setLastValidDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

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
        gap: '1px'
      }}
    >
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
            zIndex: 1
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
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: '8px',
            minHeight: '44px',
            marginBottom: '2px',
            paddingBottom: '0px',
            position: 'relative',
            zIndex: 1000,
            backgroundColor: 'var(--vpl-ui-background)'
          }}
        >
          <button
            className={`heatmap-button nodrag ${showHeatmap ? 'active' : ''}`}
            onClick={() => setShowHeatmap(!showHeatmap)}
            title={showHeatmap ? 'Hide heatmap' : 'Show heatmap'}
          >
            <img
              src={HEATMAP_ICON_PATH}
              alt="heatmap toggle"
              className="nodrag"
            />
          </button>

          {!isBinary && showHeatmap && (
            <div style={{ width: '70px' }}>
              <Dropdown
                value={selectedColormap}
                setValue={(_, value) => setSelectedColormap(value as Colormap)}
                options={COLORMAP_OPTIONS as unknown as string[]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
