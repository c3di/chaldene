import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import * as fabric from 'fabric';
import { createPortal } from 'react-dom';
import { WidgetProps } from './Widget';
import DiffMapTrigger from './DiffMapTrigger';
import { genDiffMap } from './genDiffMap';
// import CloseBackgroundTrigger from './CloseBackgroundTrigger';
import ColorBar from './ColorBar';

const getMousePosition = (e: Event) => {
  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  } else if (e instanceof TouchEvent && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: 0, y: 0 };
};

// eslint-disable-next-line @typescript-eslint/naming-convention
interface Transform {
  x: number;
  y: number;
  zoom: number;
}

interface IImageViewerProps extends WidgetProps {
  value?: {
    imageUrl: string;
    dimensions?: {
      width: number;
      height: number;
    };
    differences?: number[][];
  };
  showDiff?: boolean;
  isBinary?: boolean;
  isFullScreenControl?: {
    isFullScreen: boolean;
    setIsFullScreen: (value: boolean, transform?: Transform) => void;
    lastTransform?: Transform;
  };
  originalDimensions?: {
    width: number;
    height: number;
  };
  syncGroup?: number;
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

const createLaserDot = (x: number, y: number, zoom: number): fabric.Circle => {
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

  return new fabric.Circle({
    left: x - radius,
    top: y - radius,
    radius,
    fill: gradient,
    selectable: false,
    hasControls: false,
    hasBorders: false,
    evented: false,
    originX: 'center',
    originY: 'center',
    centeredScaling: true,
    scaleX: 2 / zoom,
    scaleY: 2 / zoom
  });
};

const DimensionsText = memo(
  ({
    dimensions,
    isFullScreen
  }: {
    dimensions?: {
      width: number;
      height: number;
    };
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
  )
);

const MemoizedColorBar = memo(ColorBar);

export default function ImageViewer({
  value,
  editorContext,
  showDiff,
  isBinary,
  isFullScreenControl,
  nodeDimensions,
  originalDimensions,
  syncGroup,
  forWhom
}: IImageViewerProps): JSX.Element {
  const canvasElParent = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const currentSyncGroup = useRef<number | undefined>(syncGroup);
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

  const lastTransform = useRef<{
    x: number;
    y: number;
    zoom: number;
  } | null>(null);

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

  // const [showBackground, setShowBackground] = useState(true);

  useEffect(() => {
    const parent = canvasElParent.current;
    if (!parent) {
      return;
    }

    // Use provided original dimensions or calculate them
    if (!originalCanvasDimensions.current) {
      originalCanvasDimensions.current = originalDimensions || {
        width: parent.clientWidth,
        height: parent.clientHeight
      };
    }

    // Always update fullscreen dimensions
    fullscreenDimensions.current = {
      width: window.innerWidth,
      height: window.innerHeight - 24
    };

    // Delay resize to ensure dimensions are set
    requestAnimationFrame(() => {
      resizeCanvas();
    });
  }, [isFullScreen, originalDimensions]);

  // Add a separate effect to initialize original dimensions once
  useEffect(() => {
    const parent = canvasElParent.current;
    if (!parent || originalCanvasDimensions.current) {
      return;
    }

    originalCanvasDimensions.current = {
      width: parent.clientWidth,
      height: parent.clientHeight
    };
  }, []); // Run once on mount

  function resizeCanvas() {
    const parent = canvasElParent.current;
    if (!parent || !canvas.current) {
      return;
    }

    const scaleRatio = getScaleRatio();
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;

    // Update canvas dimensions
    canvas.current.setDimensions({
      width: parentWidth,
      height: parentHeight
    });

    // If we have an image, rescale it to fit the new canvas size
    if (image) {
      const scaleFactor = Math.min(
        parentWidth / (image.width ?? 1),
        parentHeight / (image.height ?? 1)
      );

      // Apply scale ratio in fullscreen mode
      const finalScale = isFullScreen ? scaleFactor * scaleRatio : scaleFactor;
      canvas.current.setZoom(finalScale);

      // Center the image
      const viewportTransform = canvas.current.viewportTransform;
      const centerX = (parentWidth - (image.width ?? 0) * finalScale) / 2;
      const centerY = (parentHeight - (image.height ?? 0) * finalScale) / 2;
      viewportTransform[4] = centerX;
      viewportTransform[5] = centerY;
    }

    canvas.current.renderAll();
  }

  const getScaleRatio = () => {
    if (!originalCanvasDimensions.current || !fullscreenDimensions.current) {
      return isFullScreen ? 3 : 1 / 3; // Special default value for debugging
    }

    const originalWidth = originalCanvasDimensions.current.width;
    const originalHeight = originalCanvasDimensions.current.height;
    const ratio = Math.min(
      fullscreenDimensions.current.width / originalWidth,
      fullscreenDimensions.current.height / originalHeight
    );

    return isFullScreen ? ratio : 1 / ratio;
  };

  const updateGlobalTransform = () => {
    if (!editorContext || !canvas.current) {
      return;
    }

    const viewportTransform = canvas.current.viewportTransform;
    const currentZoom = canvas.current.getZoom();
    const scaleRatio = getScaleRatio();

    const localTransform = isFullScreen
      ? {
          x: viewportTransform[4] / scaleRatio,
          y: viewportTransform[5] / scaleRatio,
          zoom: currentZoom / scaleRatio
        }
      : {
          x: viewportTransform[4],
          y: viewportTransform[5],
          zoom: currentZoom
        };

    editorContext.updateGlobalTransform({
      syncGrouptoUpdate: currentSyncGroup.current,
      ...localTransform
    });
  };

  const updateLastPos = (x: number, y: number) => {
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
      updateLastPos(x, y);
    });

    canvas.current.on('mouse:move', opt => {
      if (isPanning.current) {
        const viewportTransform = canvas.current!.viewportTransform;
        const { x, y } = getMousePosition(opt.e);
        viewportTransform[4] += x - lastPosX.current;
        viewportTransform[5] += y - lastPosY.current;
        canvas.current?.renderAll();
        updateLastPos(x, y);
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
    if (!canvas.current) {
      return;
    }

    const newImageUrl = value?.imageUrl;
    const currentImageUrl = image?.getSrc();
    if (newImageUrl === currentImageUrl && image) {
      return;
    }

    canvas.current.clear();

    if (!newImageUrl && image) {
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
    } = editorContext?.getImageViewTransform(syncGroup) ?? {};

    const scaleRatio = getScaleRatio();

    // Only scale coordinates and zoom in fullscreen mode
    const viewportX = isFullScreen
      ? asyncX !== undefined
        ? asyncX * scaleRatio
        : undefined
      : asyncX;
    const viewportY = isFullScreen
      ? asyncY !== undefined
        ? asyncY * scaleRatio
        : undefined
      : asyncY;
    const viewportZoom = isFullScreen
      ? asyncZoom !== undefined
        ? asyncZoom * scaleRatio
        : undefined
      : asyncZoom;

    const scaleFactor =
      viewportZoom ??
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

    // Only set background image if showBackground is true
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

    const viewportTransform = canvas.current.viewportTransform;
    if (viewportX !== undefined && viewportY !== undefined) {
      viewportTransform[4] = viewportX;
      viewportTransform[5] = viewportY;
    } else {
      const centerX = (canvas.current.width - image.width * scaleFactor) / 2;
      const centerY = (canvas.current.height - image.height * scaleFactor) / 2;
      viewportTransform[4] = centerX;
      viewportTransform[5] = centerY;
    }
    canvas.current.renderAll();
  }, [
    editorContext?.getImageViewTransform(syncGroup),
    image,
    isFullScreen,
    true,
    showDiffMap
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
      laserDot = createLaserDot(
        mousePos.x!,
        mousePos.y!,
        canvas.current?.getZoom() ?? 1
      );
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

  const handleScreenToggle = useCallback(() => {
    if (!canvas.current) {
      return;
    }

    const viewportTransform = canvas.current.viewportTransform;
    const currentZoom = canvas.current.getZoom();
    const scaleRatio = getScaleRatio();

    // Store transform in the coordinate space of the target mode
    const transform = {
      x: isFullScreen
        ? viewportTransform[4] / scaleRatio
        : viewportTransform[4] * scaleRatio,
      y: isFullScreen
        ? viewportTransform[5] / scaleRatio
        : viewportTransform[5] * scaleRatio,
      zoom: isFullScreen ? currentZoom / scaleRatio : currentZoom * scaleRatio
    };

    // Pass the transform through the callback
    setIsFullScreen(!isFullScreen, transform);
  }, [isFullScreen, setIsFullScreen]);

  // Update the restore transform effect to use the passed transform
  useEffect(() => {
    if (!canvas.current) {
      return;
    }

    const transform =
      isFullScreenControl?.lastTransform ?? lastTransform.current;
    if (!transform) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!canvas.current) {
        return;
      }

      canvas.current.setZoom(transform.zoom);
      const viewportTransform = canvas.current.viewportTransform;
      viewportTransform[4] = transform.x;
      viewportTransform[5] = transform.y;

      canvas.current.renderAll();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isFullScreen, isFullScreenControl?.lastTransform]);

  // Add effect to handle node dimension changes
  useEffect(() => {
    if (!nodeDimensions || isFullScreen) {
      return;
    }

    // Add a small delay to ensure the parent div has been resized
    const timeoutId = setTimeout(() => {
      resizeCanvas();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [nodeDimensions, isFullScreen]);

  // Add effect to handle fullscreen resizing
  useEffect(() => {
    if (!isFullScreen) {
      return;
    }

    const timeoutId = setTimeout(() => {
      resizeCanvas();
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isFullScreen]);

  // Update ref when syncGroup changes
  useEffect(() => {
    currentSyncGroup.current = syncGroup;
  }, [syncGroup]);

  return (
    <div
      className="image-viewer-widget widget"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: isFullScreen ? '100vw' : '100%',
        height: isFullScreen ? '100vh' : '100%',
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
        style={{
          width: isFullScreen
            ? '100%'
            : nodeDimensions?.width
              ? `${nodeDimensions.width - 23}px`
              : '100%',
          height: isFullScreen
            ? '100%'
            : nodeDimensions?.height
              ? `${nodeDimensions.height - 80}px`
              : '150px'
        }}
      >
        <div
          ref={canvasElParent}
          className={'nodrag nowheel widget canvas-container'}
          style={{
            width: isFullScreen ? '100vw' : '100%',
            height: isFullScreen ? 'calc(100vh - 24px)' : '100%',
            padding: 0,
            overflow: 'hidden'
          }}
        >
          <canvas
            ref={canvasElement}
            className={`nodrag nowheel widget imageview ${isPanning.current ? 'grabbing' : 'grab'}`}
          />
        </div>
      </div>
      {image && showDiff && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            position: isFullScreen ? 'absolute' : 'relative',
            bottom: isFullScreen ? '20px' : 'auto',
            left: isFullScreen ? '20px' : 'auto',
            marginTop: '4px',
            zIndex: isFullScreen ? 10000 : 'auto',
            backgroundColor: isFullScreen
              ? 'rgba(0, 0, 0, 0.7)'
              : 'transparent',
            borderRadius: isFullScreen ? '4px' : '0',
            padding: isFullScreen ? '4px' : '0',
            color: isFullScreen ? 'white' : 'inherit'
          }}
        >
          <div className="triggers-row">
            <DiffMapTrigger
              toggled={showDiffMap}
              toggle={() => setShowDiffMap(!showDiffMap)}
            />
            {/* <CloseBackgroundTrigger
              toggled={showBackground}
              toggle={() => setShowBackground(!showBackground)}
            /> */}
          </div>
          {showDiffMap && (
            <div className="color-bar-container">
              <MemoizedColorBar colormap={isBinary ? 'binary' : 'turbo'} />
            </div>
          )}
        </div>
      )}
      {isFullScreen && !isFullScreenControl && (
        <FullScreenPortal onClose={() => setIsFullScreen(false)}>
          <ImageViewer
            value={portalValue}
            editorContext={editorContext}
            showDiff={showDiff}
            isBinary={isBinary}
            isFullScreenControl={{
              isFullScreen: true,
              setIsFullScreen: (value, transform) => {
                if (transform) {
                  lastTransform.current = transform;
                }
                setIsFullScreen(value);
              }
            }}
            nodeDimensions={nodeDimensions}
            originalDimensions={originalCanvasDimensions.current ?? undefined}
          />
        </FullScreenPortal>
      )}
    </div>
  );
}
