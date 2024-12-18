import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { createPortal } from 'react-dom';
import { WidgetProps } from './Widget';
import DiffMapTrigger from './DiffMapTrigger';
import { genDiffMap } from './genDiffMap';

const getMousePosition = (e: Event) => {
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
  isFullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
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

function ImageViewer({
  value,
  editorContext,
  heatmapOverlay,
  isBinary,
  isFullscreen = false,
  onFullscreenChange,
  transformMultiplier = 1,
  onContainerMount
}: IImageViewerProps & {
  transformMultiplier?: number;
  onContainerMount: (element: HTMLDivElement) => void;
}): JSX.Element {
  const canvasElParent = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const [image, setImage] = useState<fabric.FabricImage | null>(null);
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showDiffMap, setShowDiffMap] = useState(false);

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
    if (containerRef.current) {
      onContainerMount(containerRef.current);
    }
  }, [onContainerMount]);

  useEffect(() => {
    if (!canvasElement.current || !canvasElParent.current) {
      return;
    }

    canvas.current = new fabric.Canvas(canvasElement.current, {
      selection: false
    });

    canvas.current.on('mouse:down', opt => {
      isPanning.current = true;
      const { x, y } = getMousePosition(opt.e);
      updateLastPox(x, y);
    });

    canvas.current.on('mouse:move', opt => {
      if (isPanning.current) {
        const viewportTransform = canvas.current!.viewportTransform;
        const { x, y } = getMousePosition(opt.e);
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
    if (!canvas.current || !image || !canvasElParent.current) {
      return;
    }

    const {
      x: asyncX,
      y: asyncY,
      zoom: asyncZoom
    } = editorContext?.getImageViewTransform() ?? {};

    const scaleFactor = asyncZoom
      ? asyncZoom * transformMultiplier
      : Math.min(
          canvas.current!.width / image.width,
          canvas.current!.height / image.height
        );

    console.log('Applied transformations:', {
      scaleFactor,
      originalZoom: asyncZoom,
      transformMultiplier,
      transformX: asyncX ? asyncX * transformMultiplier : null,
      transformY: asyncY ? asyncY * transformMultiplier : null,
      isFullscreen
    });

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
      viewportTransform[4] = asyncX ? asyncX * transformMultiplier : centerX;
      viewportTransform[5] = asyncY ? asyncY * transformMultiplier : centerY;
    }

    canvas.current!.renderAll();
  }, [
    editorContext?.getImageViewTransform(),
    image,
    showDiffMap,
    value?.differences,
    isBinary,
    isFullscreen,
    transformMultiplier
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
      ref={containerRef}
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
        {!isFullscreen && (
          <button
            className="heatmap-button nodrag"
            onClick={() => onFullscreenChange?.(true)}
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
        )}
      </div>
    </div>
  );
}

function ImageViewerWithFullscreen(props: IImageViewerProps): JSX.Element {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [transformMultiplier, setTransformMultiplier] = useState(1);
  const normalSizeRef = useRef<{ width: number; height: number } | null>(null);
  const handleContainerMount = useCallback((element: HTMLDivElement) => {
    if (!normalSizeRef.current) {
      normalSizeRef.current = {
        width: element.clientWidth,
        height: element.clientHeight
      };
      console.log(
        'Container mounted - Stored normal size:',
        normalSizeRef.current
      );
    }
  }, []);
  const handleFullscreenChange = useCallback((toFullscreen: boolean) => {
    console.log('handleFullscreenChange called:', {
      toFullscreen,
      normalSize: normalSizeRef.current,
      currentMultiplier: transformMultiplier
    });

    if (toFullscreen && normalSizeRef.current) {
      const fullscreenWidth = window.innerWidth;
      const fullscreenHeight = window.innerHeight;

      const widthRatio = fullscreenWidth / normalSizeRef.current.width;
      const heightRatio = fullscreenHeight / normalSizeRef.current.height;
      const newMultiplier = Math.min(widthRatio, heightRatio);

      console.log('Calculating new multiplier:', {
        normalWidth: normalSizeRef.current.width,
        normalHeight: normalSizeRef.current.height,
        fullscreenWidth,
        fullscreenHeight,
        widthRatio,
        heightRatio,
        newMultiplier
      });

      setTransformMultiplier(newMultiplier);
      setIsFullScreen(true);
    } else {
      console.log('Resetting multiplier to 1');
      setTransformMultiplier(1);
      setIsFullScreen(false);
    }
  }, []);

  useEffect(() => {
    console.log('State updated:', {
      isFullScreen,
      transformMultiplier,
      normalSize: normalSizeRef.current
    });
  }, [isFullScreen, transformMultiplier]);

  return (
    <>
      <ImageViewer
        {...props}
        isFullscreen={isFullScreen}
        onFullscreenChange={handleFullscreenChange}
        transformMultiplier={transformMultiplier}
        onContainerMount={handleContainerMount}
      />
      {isFullScreen && (
        <FullScreenPortal onClose={() => handleFullscreenChange(false)}>
          <ImageViewer
            {...props}
            isFullscreen={true}
            onFullscreenChange={handleFullscreenChange}
            transformMultiplier={transformMultiplier}
            onContainerMount={() => {}} // Pass empty function for fullscreen instance
          />
        </FullScreenPortal>
      )}
    </>
  );
}

export { ImageViewerWithFullscreen, ImageViewer };
