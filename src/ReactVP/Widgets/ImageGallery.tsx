/* eslint-disable @typescript-eslint/naming-convention */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';
import { LeftArrowIcon, RightArrowIcon, SelectionIcon } from '../Style/icons';

// Type definitions
declare module 'fabric' {
  interface Canvas {
    isDisposed: boolean;
    renderSelection(ctx: CanvasRenderingContext2D): void;
  }
  interface Object {
    data?: Record<string, any>;
  }
}

interface IGalleryImage {
  filename: string;
  base64: string;
  imageUrl?: string;
  fabricObject?: fabric.Image;
}

interface IImageGalleryProps extends WidgetProps {
  images?: IGalleryImage[];
  value?: string[];
}

// Configure ActiveSelection defaults
fabric.ActiveSelection.prototype.stroke = 'transparent';
fabric.ActiveSelection.prototype.strokeWidth = 0;
fabric.ActiveSelection.prototype.borderColor = 'transparent';
fabric.ActiveSelection.prototype.cornerColor = 'transparent';
fabric.ActiveSelection.prototype.borderOpacityWhenMoving = 0;
fabric.ActiveSelection.prototype.borderScaleFactor = 0;
fabric.ActiveSelection.prototype.cornerSize = 0;
fabric.ActiveSelection.prototype.transparentCorners = true;
fabric.ActiveSelection.prototype.padding = 0;
fabric.ActiveSelection.prototype.setControlsVisibility({
  mtr: false,
  mt: false,
  mb: false,
  ml: false,
  mr: false,
  bl: false,
  br: false,
  tl: false,
  tr: false
});

export function ImageGallery({
  forWhom,
  setValue,
  images
}: IImageGalleryProps): JSX.Element {
  // State and refs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const selectedRef = useRef<fabric.Image[]>([]);
  const pendingSelectionRef = useRef(false);
  const lastSelectionRef = useRef<string[]>([]);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(150);

  // Memoized values
  const canvasKey = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    return `gallery-${id}`;
  }, [typeof forWhom === 'object' ? forWhom.id : forWhom]);

  const stableImages = useMemo(
    () => images,
    [
      JSON.stringify(
        images?.map(img => ({
          filename: img.filename,
          hash: img.base64?.slice(-20)
        }))
      )
    ]
  );

  // Image handling utilities
  const createFabricImage = useCallback(
    async (src: string): Promise<fabric.Image> => {
      return new Promise((resolve, reject) => {
        fabric.FabricImage.fromURL(src).then(img => {
          img.set({
            originX: 'left',
            originY: 'top',
            hasBorders: false,
            hasControls: false
          });
          resolve(img);
        }, reject);
      });
    },
    []
  );

  const calculateScale = useCallback(
    (img: fabric.Image, finalThumbSize: number) => {
      return Math.min(
        finalThumbSize / img.width!,
        finalThumbSize / img.height!
      );
    },
    []
  );

  // Selection handling
  const handleSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const selected = canvas.getActiveObjects() as fabric.Image[];
    const filenames = selected
      .map(o => o.data?.filename)
      .filter(Boolean) as string[];

    if (
      JSON.stringify(filenames) === JSON.stringify(lastSelectionRef.current)
    ) {
      return;
    }

    selectedRef.current = selected;
    lastSelectionRef.current = filenames;
    setValue?.(forWhom, filenames);
  }, [setValue, forWhom]);

  // Layout management
  const arrangeThumbnails = useCallback(
    (thumbnails: IGalleryImage[], canvas: fabric.Canvas) => {
      if (canvas.isDisposed) {
        return;
      }

      // Remove stale objects
      canvas.getObjects().forEach(obj => {
        if (!thumbnails.some(t => t.fabricObject === obj)) {
          canvas.remove(obj);
        }
      });

      // Calculate layout
      const containerWidth = canvas.width - 15;
      const padding = 15;
      const minThumbSize = 80;
      const numCols = Math.max(
        1,
        Math.floor((containerWidth + padding) / (minThumbSize + padding))
      );
      const thumbSize = Math.floor(
        (containerWidth - (numCols - 1) * padding) / numCols
      );

      let maxBottom = 0;
      thumbnails.forEach(({ fabricObject }, index) => {
        if (!fabricObject) {
          return;
        }

        const col = index % numCols;
        const row = Math.floor(index / numCols);
        const scale = calculateScale(fabricObject, thumbSize);
        const scaledHeight = fabricObject.height! * scale;
        const position = {
          left: 5 + col * (thumbSize + padding),
          top: 5 + row * (scaledHeight + padding)
        };

        fabricObject.set({ ...position, scaleX: scale, scaleY: scale });
        if (!canvas.contains(fabricObject)) {
          canvas.add(fabricObject);
        }
        maxBottom = Math.max(maxBottom, position.top + scaledHeight);
      });

      // Update canvas height
      const newHeight = thumbnails.length > 0 ? maxBottom + padding : 150;
      setCanvasHeight(newHeight);
      canvas.setHeight(newHeight);
      canvas.renderAll();
    },
    [calculateScale]
  );

  // Image loading
  const loadImages = useCallback(
    async (canvas: fabric.Canvas, images: IGalleryImage[]) => {
      try {
        if (canvas.isDisposed) {
          return;
        }
        setLoading(true);
        setError(null);

        const processed = await Promise.all(
          images.map(async img => {
            const existing = canvas
              .getObjects()
              .find(
                o =>
                  (o as unknown as fabric.Image).data?.filename === img.filename
              ) as fabric.Image | undefined;

            if (existing) {
              return { ...img, fabricObject: existing };
            }

            const fabricImg = await createFabricImage(
              img.base64 || img.imageUrl!
            );
            return {
              ...img,
              fabricObject: fabricImg.set({
                data: { filename: img.filename },
                originX: 'left',
                originY: 'top',
                hasControls: false,
                hasBorders: false,
                lockMovementX: true,
                lockMovementY: true,
                selectable: true,
                hoverCursor: 'pointer'
              })
            };
          })
        );

        if (!canvas.isDisposed) {
          // Add class to canvas container when images are present
          const container = canvas.wrapperEl;
          if (container) {
            container.classList.toggle('has-images', images.length > 0);
          }
          arrangeThumbnails(processed, canvas);
        }
      } catch (err) {
        console.error('[Load] Failed:', err);
        setError('Failed to load images');
      } finally {
        if (!canvas.isDisposed) {
          setLoading(false);
        }
      }
    },
    [createFabricImage, arrangeThumbnails]
  );

  // Canvas initialization
  useEffect(() => {
    const canvasElement = document.getElementById(canvasKey);
    if (!canvasElement) {
      return;
    }

    while (canvasElement.firstChild) {
      canvasElement.removeChild(canvasElement.firstChild);
    }

    const parentWidth = canvasElement.parentElement?.clientWidth || 500;
    const newCanvas = new fabric.Canvas(canvasKey, {
      width: parentWidth,
      height: canvasHeight,
      selection: true,
      renderOnAddRemove: false,
      allowMultipleSelection: false,
      selectionKey: 'shiftKey',
      selectionColor: 'transparent',
      selectionBorderColor: 'transparent',
      selectionLineWidth: 0
    });

    // Add this after canvas initialization
    if (newCanvas.wrapperEl) {
      newCanvas.wrapperEl.style.removeProperty('width');
    }

    // Handle selection events
    newCanvas.on('mouse:down', event => {
      const target = event.target;
      if (!target) {
        newCanvas.discardActiveObject();
        newCanvas.renderAll();
        return;
      }

      requestAnimationFrame(() => {
        if (event.e.shiftKey) {
          handleMultiSelection(newCanvas, target);
        } else {
          handleSingleSelection(newCanvas, target, pendingSelectionRef);
        }
      });

      setTimeout(handleSelection, 0);
    });

    newCanvas.on('selection:cleared', () => {
      if (!pendingSelectionRef.current) {
        handleDiscardSelection(newCanvas, handleSelection);
      }
    });

    canvasRef.current = newCanvas;
    if (stableImages) {
      loadImages(newCanvas, stableImages);
    }

    return () => {
      newCanvas.dispose();
      canvasRef.current = null;
    };
  }, [canvasKey, canvasHeight]);

  // Handle image updates
  useEffect(() => {
    if (!canvasRef.current || !stableImages) {
      return;
    }
    loadImages(canvasRef.current, stableImages);
  }, [stableImages, loadImages]);

  // Modify handleSelectAll to update the selection state
  const handleSelectAllClick = useCallback(() => {
    if (!canvasRef.current) {
      return;
    }

    if (!isAllSelected) {
      handleSelectAll(canvasRef.current, handleSelection);
      setIsAllSelected(true);
    } else {
      handleDiscardSelection(canvasRef.current, handleSelection);
      setIsAllSelected(false);
    }
  }, [canvasRef, handleSelection, isAllSelected]);

  return (
    <div className="image-gallery-widget widget">
      <div className="gallery-controls">
        <button
          onClick={() =>
            canvasRef.current &&
            handleMoveSelection(
              canvasRef.current,
              'left',
              handleSelection,
              pendingSelectionRef
            )
          }
          disabled={
            !canvasRef.current ||
            canvasRef.current.getActiveObjects().length === 0 ||
            canvasRef.current.getActiveObjects().length ===
              canvasRef.current.getObjects().length
          }
        >
          <LeftArrowIcon />
        </button>
        <button
          onClick={() =>
            canvasRef.current &&
            handleMoveSelection(
              canvasRef.current,
              'right',
              handleSelection,
              pendingSelectionRef
            )
          }
          disabled={
            !canvasRef.current ||
            canvasRef.current.getActiveObjects().length === 0 ||
            canvasRef.current.getActiveObjects().length ===
              canvasRef.current.getObjects().length
          }
        >
          <RightArrowIcon />
        </button>
        <button
          onClick={handleSelectAllClick}
          disabled={
            !canvasRef.current || canvasRef.current.getObjects().length === 0
          }
        >
          <SelectionIcon showCheck={isAllSelected} />
        </button>
      </div>
      <canvas
        id={canvasKey}
        width="100%"
        height={canvasHeight}
        style={{ contain: 'strict' }}
      />
      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}

// Selection helper functions
function handleMultiSelection(canvas: fabric.Canvas, target: fabric.Object) {
  const activeObjects = canvas.getActiveObjects();
  if (!activeObjects.includes(target)) {
    target.set({
      hasControls: false,
      hasBorders: true,
      borderColor: '#1976d2',
      borderScaleFactor: 2
    });

    const newSelection = [...activeObjects, target];
    canvas.discardActiveObject();
    const activeSelection = new fabric.ActiveSelection(newSelection, {
      canvas: canvas,
      hasControls: false,
      hasBorders: false,
      selectable: false,
      evented: false,
      padding: 0
    });

    canvas.setActiveObject(activeSelection);
    activeSelection.forEachObject(obj => {
      obj.set({
        borderColor: '#1976d2',
        borderScaleFactor: 2,
        hasBorders: true
      });
    });
    canvas.renderAll();
  }
}

function handleSingleSelection(
  canvas: fabric.Canvas,
  target: fabric.Object,
  pendingRef: React.MutableRefObject<boolean>
) {
  canvas.getActiveObjects().forEach(obj => {
    obj.set({
      hasBorders: false,
      borderColor: 'transparent'
    });
  });

  target.set({
    hasControls: false,
    hasBorders: true,
    borderColor: '#1976d2',
    borderScaleFactor: 2
  });

  pendingRef.current = true;
  canvas.discardActiveObject();
  canvas.setActiveObject(target);
  canvas.renderAll();
}

function handleSelectAll(canvas: fabric.Canvas, handleSelection: () => void) {
  const activeSelection = new fabric.ActiveSelection(canvas.getObjects(), {
    canvas: canvas,
    hasControls: false,
    hasBorders: false,
    selectable: false,
    evented: false,
    padding: 0
  });

  canvas.setActiveObject(activeSelection);
  activeSelection.forEachObject(obj => {
    obj.set({
      borderColor: '#1976d2',
      borderScaleFactor: 2,
      hasBorders: true
    });
  });
  canvas.renderAll();
  handleSelection();
}

function handleDiscardSelection(
  canvas: fabric.Canvas,
  handleSelection: () => void
) {
  canvas.discardActiveObject();
  canvas.getObjects().forEach(obj => {
    obj.set({
      hasBorders: false,
      borderColor: 'transparent'
    });
  });
  canvas.renderAll();
  handleSelection();
}

function handleMoveSelection(
  canvas: fabric.Canvas,
  direction: 'left' | 'right',
  handleSelection: () => void,
  pendingRef: React.MutableRefObject<boolean>
) {
  const objects = canvas.getObjects();
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length === 0) {
    return;
  }

  const currentIndex = objects.indexOf(activeObjects[0]);
  const newIndex =
    direction === 'left'
      ? Math.max(0, currentIndex - 1)
      : Math.min(objects.length - 1, currentIndex + 1);

  if (currentIndex === newIndex) {
    return;
  }

  const targetObject = objects[newIndex];
  handleSingleSelection(canvas, targetObject, pendingRef);
  handleSelection();
}
