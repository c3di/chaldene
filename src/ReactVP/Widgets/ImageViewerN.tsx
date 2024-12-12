import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { createPortal } from 'react-dom';
import { WidgetProps } from './Widget';
import DiffMapTrigger from './DiffMapTrigger';
import { genDiffMap } from './genDiffMap';

const getPointerCoordinates = (e: Event) => {
  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  } else if (e instanceof TouchEvent && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: 0, y: 0 };
};

interface IImageViewerProps extends WidgetProps {
  value?: {
    imageUrl: string;
    dimensions?: {
      width: number;
      height: number;
    };
    differences?: number[][];
  };
  heatmapOverlay?: boolean;
  isBinary?: boolean;
}

function FullScreenPortal({
  onClose,
  children
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '16px',
          display: 'flex',
          justifyContent: 'flex-end'
        }}
      >
        <button
          className="heatmap-button nodrag"
          onClick={onClose}
          title="Exit fullscreen"
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1 }}>{children}</div>
    </div>,
    document.body
  );
}

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

  const [showDiffMap, setShowDiffMap] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  //console.log('ImageViewer', isFullScreen, setSelectedColormap, setShowHeatmap);

  const updateMousePosition = (
    x: number | undefined,
    y: number | undefined
  ) => {
    if (!editorContext) {
      return;
    }
    editorContext.updateMousePosition({ x, y });
  };

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
      if (isPanning.current) {
        const viewportTransform = canvas.current!.viewportTransform;
        const { x, y } = getPointerCoordinates(opt.e);
        viewportTransform[4] += x - lastPosX.current;
        viewportTransform[5] += y - lastPosY.current;
        canvas.current?.renderAll();
        updateLastPox(x, y);
      }

      const pointer = canvas.current?.getScenePoint(opt.e);
      updateMousePosition(pointer?.x, pointer?.y);
    });

    canvas.current.on('mouse:out', () => {
      updateMousePosition(undefined, undefined);
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
    if (!canvas.current) {
      return;
    }
    canvas.current.clear();
    if (!value?.imageUrl) {
      return;
    }
    fabric.FabricImage.fromURL(value?.imageUrl)
      .then((img: fabric.Image) => {
        if (canvas.current?.backgroundImage === img) {
          return;
        }
        setImage(img);
      })
      .catch(err => {
        console.error('Failed to load image', err);
      });
  }, [value]);

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

    const laserDot = (canvas.current as any).laserDot;
    laserDot?.set({
      scaleX: 2 / scaleFactor,
      scaleY: 2 / scaleFactor
    });

    canvas.current!.backgroundImage = image;
    if (showDiffMap && value?.differences) {
      const diffImage = genDiffMap(
        value.differences,
        isBinary ? 'binary' : 'turbo'
      );
      canvas.current!.overlayImage = diffImage;
    } else {
      canvas.current!.overlayImage = undefined;
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
    showDiffMap,
    value?.differences,
    isBinary
  ]);

  useEffect(() => {
    if (!canvas.current || !image) {
      return;
    }

    let laserDot = (canvas.current as any).laserDot;
    const mousePos = editorContext?.getMousePosition() ?? {};

    const isOutOfCanvas = mousePos.x === undefined || mousePos.y === undefined;
    if (isOutOfCanvas) {
      if (laserDot) {
        canvas.current?.remove(laserDot);
        (canvas.current as any).laserDot = undefined;
      }
      return;
    }

    if (!laserDot) {
      const radius = 10;
      const gradient = new fabric.Gradient({
        type: 'radial',
        coords: {
          x1: radius,
          y1: radius,
          r1: 0,
          x2: radius,
          y2: radius,
          r2: radius
        },
        colorStops: [
          { offset: 0, color: 'rgba(255, 0, 0, 0.8)' },
          { offset: 1, color: 'rgba(255, 255, 255, 0)' }
        ]
      });

      laserDot = new fabric.Circle({
        left: mousePos.x! - radius,
        top: mousePos.y! - radius,
        radius: radius,
        fill: gradient,
        selectable: false,
        hasControls: false,
        hasBorders: false,
        evented: false,
        originX: 'center',
        originY: 'center',
        centeredScaling: true
      });

      laserDot.set({
        scaleX: 2 / (canvas.current?.getZoom() ?? 1),
        scaleY: 2 / (canvas.current?.getZoom() ?? 1)
      });
      canvas.current!.add(laserDot);
      (canvas.current as any).laserDot = laserDot;
    } else {
      laserDot.set({
        left: mousePos.x!,
        top: mousePos.y!
      });
      laserDot.setCoords();
      canvas.current?.renderAll();
    }
  }, [editorContext?.getMousePosition()]);

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
        />{' '}
      </div>
      <div
        className="nodrag nowheel"
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'var(--vpl-ui-background)',
          height: '44px'
        }}
      >
        {heatmapOverlay && (
          <DiffMapTrigger
            toggled={showDiffMap}
            toggle={() => setShowDiffMap(!showDiffMap)}
            isBinary={isBinary ?? false}
          />
        )}
        <button
          className="heatmap-button nodrag"
          onClick={() => {
            setIsFullScreen(true);
          }}
          title="View fullscreen"
          style={{ marginLeft: '8px' }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6H0V0H6V2H2V6ZM0 8H2V12H6V14H0V8ZM12 12H8V14H14V8H12V12ZM8 2V0H14V6H12V2H8Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
      {isFullScreen && (
        <FullScreenPortal onClose={() => setIsFullScreen(false)}>
          <ImageViewer
            value={value}
            editorContext={editorContext}
            heatmapOverlay={heatmapOverlay}
            isBinary={isBinary}
          />
        </FullScreenPortal>
      )}
    </div>
  );
}
