import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
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
  isFullScreenControl?: {
    isFullScreen: boolean;
    setIsFullScreen: (value: boolean) => void;
  };
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
      <div style={{ flex: 1 }}>{children}</div>
    </div>,
    document.body
  );
}

const ScreenToggleButton = memo(
  ({
    isFullScreen,
    onToggle
  }: {
    isFullScreen: boolean;
    onToggle: () => void;
  }) => {
    return (
      <button
        className="fullscreen-button nodrag"
        onClick={onToggle}
        title={isFullScreen ? 'Exit fullscreen' : 'View fullscreen'}
        style={{
          padding: '4px'
        }}
      >
        {!isFullScreen ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width="100%"
            height="100%"
            fill="currentColor"
          >
            <path d="m61 1h-17a2 2 0 0 0 0 4h12.008l-18.389 17.553a2 2 0 1 0 2.762 2.894l18.619-17.773v12.326a2 2 0 0 0 4 0v-17a2 2 0 0 0 -2-2z" />
            <path d="m61 42a2 2 0 0 0 -2 2v12.172l-18.586-18.586a2 2 0 0 0 -2.828 2.828l18.586 18.586h-12.172a2 2 0 0 0 0 4h17a2 2 0 0 0 2-2v-17a2 2 0 0 0 -2-2z" />
            <path d="m22.586 38.586-17.586 17.586v-12.172a2 2 0 0 0 -4 0v17a2 2 0 0 0 2 2h17a2 2 0 0 0 0-4h-12.172l17.586-17.586a2 2 0 0 0 -2.828-2.828z" />
            <path d="m7.828 5h12.172a2 2 0 0 0 0-4h-17a2 2 0 0 0 -2 2v17a2 2 0 0 0 4 0v-12.172l17.586 17.586a2 2 0 0 0 2.828-2.828z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            height="24"
            viewBox="0 0 24 24"
            width="24"
          >
            <path
              clipRule="evenodd"
              d="m22.4247 1.57564c.2343.23431.2343.61421 0 .84853l-4.9758 4.97573h3.5515c.3314 0 .6.26863.6.6s-.2686.6-.6.6h-5c-.3314 0-.6-.26863-.6-.6v-5c0-.33137.2686-.6.6-.6s.6.26863.6.6v3.55147l4.9757-4.97573c.2343-.23432.6142-.23432.8486 0zm-19.42431 15.02426c-.33137 0-.6-.2686-.6-.6s.26863-.6.6-.6h5c.33137 0 .6.2686.6.6v5c0 .3314-.26863.6-.6.6s-.6-.2686-.6-.6v-3.5515l-4.97574 4.9758c-.23431.2343-.61421.2343-.84852 0-.23432-.2343-.23432-.6142 0-.8486l4.97573-4.9757zm-1.42426-15.02426c.23431-.23432.61421-.23432.84852 0l4.97574 4.97573v-3.55147c0-.33137.26863-.6.6-.6s.6.26863.6.6v5c0 .33137-.26863.6-.6.6h-5c-.33137 0-.6-.26863-.6-.6s.26863-.6.6-.6h3.55147l-4.97573-4.97573c-.23432-.23432-.23432-.61422 0-.84853zm14.42427 13.82426h5c.3314 0 .6.2686.6.6s-.2686.6-.6.6h-3.5515l4.9758 4.9757c.2343.2344.2343.6143 0 .8486-.2344.2343-.6143.2343-.8486 0l-4.9757-4.9758v3.5515c0 .3314-.2686.6-.6.6s-.6-.2686-.6-.6v-5c0-.3314.2686-.6.6-.6z"
              fill="currentColor"
              fillRule="evenodd"
            />
          </svg>
        )}
      </button>
    );
  }
);

export default function ImageViewer({
  value,
  editorContext,
  heatmapOverlay,
  isBinary,
  isFullScreenControl,
  nodeDimensions
}: IImageViewerProps): JSX.Element {
  const canvasElParent = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const [image, setImage] = useState<fabric.FabricImage | null>(null);
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);

  const [showDiffMap, setShowDiffMap] = useState(false);
  const [localIsFullScreen, setLocalIsFullScreen] = useState(false);
  const isFullScreen = isFullScreenControl?.isFullScreen ?? localIsFullScreen;
  const setIsFullScreen =
    isFullScreenControl?.setIsFullScreen ?? setLocalIsFullScreen;
  const [imageDimensions, setImageDimensions] = useState<
    { width: number; height: number } | undefined
  >();

  const updateMousePosition = (
    x: number | undefined,
    y: number | undefined
  ) => {
    if (!editorContext) {
      return;
    }
    editorContext.updateMousePosition({ x, y });
  };

  const originalCanvasDimensions = useRef<{
    width: number;
    height: number;
  } | null>(null);

  const fullscreenDimensions = useRef<{
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    const parent = canvasElParent.current;
    if (!parent || originalCanvasDimensions.current) {
      return;
    }

    originalCanvasDimensions.current = {
      width: parent.clientWidth,
      height: parent.clientHeight
    };

    fullscreenDimensions.current = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }, []);

  useEffect(() => {
    console.log('ImageViewer dimensions:', {
      nodeDimensions,
      canvasParentSize: canvasElParent.current
        ? {
            width: canvasElParent.current.clientWidth,
            height: canvasElParent.current.clientHeight
          }
        : null,
      canvasSize: canvasElement.current
        ? {
            width: canvasElement.current.width,
            height: canvasElement.current.height
          }
        : null,
      timestamp: new Date().toISOString()
    });
  }, [nodeDimensions]);

  function resizeCanvas() {
    const parent = canvasElParent.current;
    if (!parent) {
      return;
    }

    console.log('Canvas resize:', {
      parentDimensions: {
        width: parent.clientWidth,
        height: parent.clientHeight
      },
      nodeDimensions,
      isFullScreen,
      timestamp: new Date().toISOString()
    });

    canvas.current?.setDimensions({
      width: parent.clientWidth,
      height: parent.clientHeight
    });
    canvas.current?.renderAll();
  }

  const getScaleRatio = () => {
    if (!originalCanvasDimensions.current || !fullscreenDimensions.current) {
      console.log('Cannot calculate scale ratio - missing dimensions');
      return 1;
    }

    const currentDimensions = isFullScreen
      ? fullscreenDimensions.current
      : originalCanvasDimensions.current;

    const originalWidth = originalCanvasDimensions.current.width;
    const originalHeight = originalCanvasDimensions.current.height;

    const ratio = isFullScreen
      ? Math.min(
          currentDimensions.width / originalWidth,
          currentDimensions.height / originalHeight
        )
      : 1 /
        Math.min(
          fullscreenDimensions.current.width / originalWidth,
          fullscreenDimensions.current.height / originalHeight
        );

    // console.log('Scale ratio calculation:', {
    //   currentDimensions,
    //   originalDimensions: originalCanvasDimensions.current,
    //   ratio,
    //   isFullScreen,
    //   calculation: isFullScreen
    //     ? 'fullscreen/original'
    //     : '1/(fullscreen/original)'
    // });

    return ratio;
  };

  const updateGlobalTransform = () => {
    if (!editorContext || !canvas.current) {
      return;
    }

    const viewportTransform = canvas.current.viewportTransform;
    const currentZoom = canvas.current.getZoom();
    const scaleRatio = getScaleRatio();

    // console.log('Updating global transform:', {
    //   before: {
    //     x: viewportTransform[4],
    //     y: viewportTransform[5],
    //     zoom: currentZoom
    //   },
    //   after: {
    //     x: viewportTransform[4] / scaleRatio,
    //     y: viewportTransform[5] / scaleRatio,
    //     zoom: currentZoom / scaleRatio
    //   },
    //   scaleRatio,
    //   isFullScreen
    // });

    editorContext.updateGlobalTransform({
      x: viewportTransform[4] / scaleRatio,
      y: viewportTransform[5] / scaleRatio,
      zoom: currentZoom / scaleRatio
    });
  };

  const updateLastPox = (x: number, y: number) => {
    lastPosX.current = x;
    lastPosY.current = y;
    updateGlobalTransform();
  };

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

  const portalValue = useMemo(
    () => ({
      ...value,
      imageUrl: value?.imageUrl ?? image?.getSrc() ?? '',
      dimensions: imageDimensions ?? value?.dimensions
    }),
    [value, image, imageDimensions]
  );

  useEffect(() => {
    // console.log('Image loading effect:', {
    //   hasCanvas: !!canvas.current,
    //   imageUrl: value?.imageUrl,
    //   hasDifferences: !!value?.differences,
    //   fullValue: value,
    //   isFullScreenControl: !!isFullScreenControl,
    //   isFullScreenValue: isFullScreenControl?.isFullScreen,
    //   timestamp: new Date().toISOString()
    // });

    if (!canvas.current) {
      return;
    }

    const newImageUrl = value?.imageUrl;
    const currentImageUrl = image?.getSrc();
    if (newImageUrl === currentImageUrl && image) {
      //console.log('Skipping image load - URL unchanged');
      return;
    }

    canvas.current.clear();

    if (!newImageUrl && image) {
      //console.log('Preserving current image while updating other properties');
      canvas.current!.backgroundImage = image;
      return;
    }

    if (!newImageUrl) {
      return;
    }

    if (value.dimensions) {
      setImageDimensions(value.dimensions);
    }

    fabric.FabricImage.fromURL(newImageUrl)
      .then((img: fabric.Image) => {
        if (canvas.current?.backgroundImage === img) {
          return;
        }
        setImage(img);
        if (!value.dimensions) {
          setImageDimensions({
            width: img.width ?? 0,
            height: img.height ?? 0
          });
        }
      })
      .catch(err => {
        console.error('Failed to load image:', {
          error: err,
          isFullScreen,
          isPortalInstance: !!isFullScreenControl
        });
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

    const scaleRatio = getScaleRatio();

    // console.log('Applying transform:', {
    //   before: { x: asyncX, y: asyncY, zoom: asyncZoom },
    //   after: {
    //     x: asyncX !== undefined ? asyncX * scaleRatio : undefined,
    //     y: asyncY !== undefined ? asyncY * scaleRatio : undefined,
    //     zoom: asyncZoom !== undefined ? asyncZoom * scaleRatio : undefined
    //   },
    //   scaleRatio,
    //   isFullScreen
    // });

    const scaledX = asyncX !== undefined ? asyncX * scaleRatio : undefined;
    const scaledY = asyncY !== undefined ? asyncY * scaleRatio : undefined;
    const scaledZoom =
      asyncZoom !== undefined ? asyncZoom * scaleRatio : undefined;

    const scaleFactor =
      scaledZoom ??
      Math.min(
        canvas.current.width / image.width,
        canvas.current.height / image.height
      );

    canvas.current.setZoom(scaleFactor);

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

    if (scaledX !== undefined && scaledY !== undefined) {
      viewportTransform[4] = scaledX;
      viewportTransform[5] = scaledY;
    } else {
      const centerX = (canvas.current!.width - image.width * zoom) / 2;
      const centerY = (canvas.current!.height - image.height * zoom) / 2;
      viewportTransform[4] = centerX;
      viewportTransform[5] = centerY;
    }

    canvas.current!.renderAll();
  }, [
    editorContext?.getImageViewTransform(),
    image,
    showDiffMap,
    value?.differences,
    isBinary,
    isFullScreen
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

  const DimensionsText = ({
    dimensions,
    isFullScreen
  }: {
    dimensions?: { width: number; height: number };
    isFullScreen: boolean;
  }) => (
    <div
      style={{
        fontSize: isFullScreen ? '16px' : 'var(--vpl-ui-font-size1)',
        fontFamily: 'var(--vpl-ui-font-family)',
        color: isFullScreen ? 'white' : 'var(--vpl-ui-font-color2)'
      }}
    >
      {dimensions && <span>{`${dimensions.width}×${dimensions.height}`}</span>}
    </div>
  );

  const handleScreenToggle = useCallback(() => {
    setIsFullScreen(!isFullScreen);
  }, [isFullScreen, setIsFullScreen]);

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
      {image && (
        <div
          className="nodrag nowheel"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'var(--vpl-ui-background)',
            height: '24px'
          }}
        >
          <DimensionsText
            dimensions={imageDimensions}
            isFullScreen={isFullScreen}
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <ScreenToggleButton
              isFullScreen={isFullScreen}
              onToggle={handleScreenToggle}
            />
          </div>
        </div>
      )}

      <div
        ref={canvasElParent}
        className={'nodrag nowheel widget common-input-style'}
        style={{
          width: '100%',
          height: nodeDimensions?.height
            ? `${nodeDimensions.height - 80}px`
            : '100%',
          padding: 0
        }}
      >
        <canvas
          ref={canvasElement}
          className={`nodrag nowheel widget imageview ${isPanning.current ? 'grabbing' : 'grab'}`}
        />
      </div>
      {image && heatmapOverlay && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-start',
            position: isFullScreen ? 'absolute' : 'relative',
            bottom: isFullScreen ? '20px' : 'auto',
            left: isFullScreen ? '20px' : 'auto',
            zIndex: isFullScreen ? 10000 : 'auto',
            backgroundColor: isFullScreen
              ? 'rgba(0, 0, 0, 0.7)'
              : 'transparent',
            borderRadius: isFullScreen ? '4px' : '0',
            padding: isFullScreen ? '4px' : '0',
            color: isFullScreen ? 'white' : 'inherit'
          }}
        >
          <DiffMapTrigger
            toggled={showDiffMap}
            toggle={() => setShowDiffMap(!showDiffMap)}
            isBinary={isBinary ?? false}
          />
        </div>
      )}
      {isFullScreen && !isFullScreenControl && (
        <FullScreenPortal onClose={() => setIsFullScreen(false)}>
          <ImageViewer
            value={portalValue}
            editorContext={editorContext}
            heatmapOverlay={heatmapOverlay}
            isBinary={isBinary}
            isFullScreenControl={{
              isFullScreen: true,
              setIsFullScreen
            }}
            nodeDimensions={nodeDimensions}
          />
        </FullScreenPortal>
      )}
    </div>
  );
}
