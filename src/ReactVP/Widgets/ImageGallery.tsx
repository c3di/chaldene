/* eslint-disable @typescript-eslint/naming-convention */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';

// Module augmentation to add missing properties
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

export function ImageGallery({
  forWhom,
  setValue,
  images
}: IImageGalleryProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<fabric.Canvas | null>(null);
  const selectedRef = useRef<fabric.Image[]>([]);
  const pendingSelectionRef = useRef(false);
  const lastSelectionRef = useRef<string[]>([]);

  // Stable canvas key based on forWhom ID
  const canvasKey = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    return `gallery-${id}`;
  }, [typeof forWhom === 'object' ? forWhom.id : forWhom]);

  // Deep compare images to prevent unnecessary reloads
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

  const createFabricImage = useCallback(async (src: string) => {
    return new Promise<fabric.Image>((resolve, reject) => {
      fabric.FabricImage.fromURL(src).then(img => {
        img.set({
          originX: 'left',
          originY: 'top',
          borderColor: 'transparent',
          cornerColor: 'transparent',
          cornerSize: 8,
          transparentCorners: false
        });
        resolve(img);
      }, reject);
    });
  }, []);

  const calculateScale = useCallback(
    (img: fabric.Image, finalThumbSize: number) => {
      return Math.min(
        finalThumbSize / img.width!,
        finalThumbSize / img.height!
      );
    },
    []
  );

  const processImages = useCallback(
    async (images: IGalleryImage[]) => {
      const currentObjects = canvasRef.current?.getObjects() || [];

      return Promise.all(
        images.map(async img => {
          const existing = currentObjects.find(
            o => (o as fabric.Image).data?.filename === img.filename
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
              borderColor: 'transparent',
              hasControls: false,
              hasBorders: true,
              lockMovementX: true,
              lockMovementY: true,
              selectable: true,
              hoverCursor: 'pointer',
              cornerColor: 'transparent'
            })
          };
        })
      );
    },
    [createFabricImage]
  );

  const handleSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const selected = canvas.getActiveObjects() as fabric.Image[];
    const filenames = selected
      .map(o => o.data?.filename)
      .filter(Boolean) as string[];

    // Check if selection has actually changed
    if (
      JSON.stringify(filenames) === JSON.stringify(lastSelectionRef.current)
    ) {
      return; // Skip if selection hasn't changed
    }

    // Update selections
    selectedRef.current?.forEach(obj => {
      if (!selected.includes(obj)) {
        obj.set({
          borderColor: 'transparent',
          borderScaleFactor: 1
        });
      }
    });

    selected.forEach(obj => {
      obj.set({
        borderColor: '#2196f3',
        borderScaleFactor: 2
      });
    });

    selectedRef.current = selected;
    lastSelectionRef.current = filenames;
    canvas.renderAll();

    setValue?.(forWhom, filenames);
  }, [setValue]);

  const arrangeThumbnails = useCallback(
    (thumbnails: IGalleryImage[], canvas: fabric.Canvas) => {
      try {
        if (canvas.isDisposed) {
          return;
        }

        const currentObjects = canvas.getObjects();
        currentObjects.forEach(obj => {
          if (!thumbnails.some(t => t.fabricObject === obj)) {
            canvas.remove(obj);
          }
        });

        // Calculate optimal layout
        const containerWidth = canvas.width - 15;
        const padding = 15;
        const minThumbSize = 80;

        // Calculate number of columns
        const numCols = Math.max(
          1,
          Math.floor((containerWidth + padding) / (minThumbSize + padding))
        );

        // Calculate thumbnail size
        const calculatedThumbSize = Math.floor(
          (containerWidth - (numCols - 1) * padding) / numCols
        );

        let maxBottom = 0;

        // Position objects and track max height
        thumbnails.forEach(({ fabricObject }, index) => {
          if (!fabricObject) {
            return;
          }

          const col = index % numCols;
          const row = Math.floor(index / numCols);

          const scale = calculateScale(fabricObject, calculatedThumbSize);
          const scaledHeight = fabricObject.height! * scale;

          const position = {
            left: 5 + col * (calculatedThumbSize + padding),
            top: 5 + row * (scaledHeight + padding)
          };

          // Track maximum bottom position
          maxBottom = Math.max(maxBottom, position.top + scaledHeight);

          if (!canvas.contains(fabricObject)) {
            fabricObject.set({
              ...position,
              scaleX: scale,
              scaleY: scale
            });
            canvas.add(fabricObject);
          } else {
            fabricObject.set({
              ...position,
              scaleX: scale,
              scaleY: scale
            });
          }
        });

        // Set canvas height to fit all thumbnails plus bottom padding
        canvas.setHeight(maxBottom + padding);
        canvas.renderAll();
      } catch (error) {
        console.error('[Arrange] Error:', error);
      }
    },
    [calculateScale]
  );

  const loadImages = useCallback(
    async (canvas: fabric.Canvas, images: IGalleryImage[]) => {
      try {
        if (canvas.isDisposed) {
          console.warn('[Load] Canvas disposed');
          return;
        }

        setLoading(true);
        setError(null);

        const processed = await processImages(images);
        if (canvas.isDisposed) {
          return;
        }

        arrangeThumbnails(processed, canvas);
      } catch (err) {
        console.error('[Load] Failed:', err);
        setError('Failed to load images');
      } finally {
        if (!canvas.isDisposed) {
          setLoading(false);
        }
      }
    },
    [processImages, arrangeThumbnails]
  );

  // Canvas initialization and cleanup
  useEffect(() => {
    const canvasElement = document.getElementById(canvasKey);

    if (!canvasElement) {
      console.error('[Canvas] Element not found');
      return;
    }

    // Clean existing elements
    while (canvasElement.firstChild) {
      canvasElement.removeChild(canvasElement.firstChild);
    }

    // Get parent container dimensions
    const parentWidth = canvasElement.parentElement?.clientWidth || 500;
    const parentHeight = 300;

    const newCanvas = new fabric.Canvas(canvasKey, {
      width: parentWidth,
      height: parentHeight,
      selection: true,
      renderOnAddRemove: false,
      allowMultipleSelection: true,
      selectionKey: 'shiftKey',
      selectionColor: 'rgba(33, 150, 243, 0.3)',
      selectionBorderColor: '#2196f3',
      selectionLineWidth: 2
    });

    // Override renderSelection to hide control frame when multiple objects are selected
    newCanvas.renderSelection = function (ctx: CanvasRenderingContext2D) {
      if (this.getActiveObjects().length === 1) {
        fabric.Canvas.prototype.renderSelection.call(this, ctx);
      }
    };

    // mouse:down handles the initial click
    newCanvas.on('mouse:down', event => {
      const target = event.target;
      if (target) {
        if (event.e.shiftKey) {
          // Multi-selection case
          const activeObjects = newCanvas.getActiveObjects();
          if (!activeObjects.includes(target)) {
            const newSelection = [...activeObjects, target];
            newCanvas.discardActiveObject();
            newCanvas.setActiveObject(
              new fabric.ActiveSelection(newSelection, { canvas: newCanvas })
            );
          }
        } else {
          // Single selection case
          pendingSelectionRef.current = true;
          newCanvas.discardActiveObject();
          newCanvas.setActiveObject(target);
        }
      }
    });

    // These events fire after the selection is actually changed
    newCanvas.on('selection:created', () => {
      pendingSelectionRef.current = false;
      handleSelection();
    });

    newCanvas.on('selection:updated', () => {
      pendingSelectionRef.current = false;
      handleSelection();
    });

    newCanvas.on('selection:cleared', () => {
      if (!pendingSelectionRef.current) {
        selectedRef.current.forEach(obj => {
          obj.set({ borderColor: 'transparent' });
        });
        selectedRef.current = [];
        newCanvas.requestRenderAll();
        setValue?.(forWhom, []);
      }
    });

    canvasRef.current = newCanvas;

    // Load initial images
    if (stableImages) {
      loadImages(newCanvas, stableImages);
    }

    return () => {
      if (newCanvas) {
        newCanvas.off('selection:created');
        newCanvas.off('selection:updated');
        newCanvas.dispose();
      }
      canvasRef.current = null;
    };
  }, [canvasKey]);

  // Handle image updates
  useEffect(() => {
    if (!canvasRef.current || !stableImages) {
      return;
    }
    loadImages(canvasRef.current, stableImages);
  }, [stableImages, loadImages]);

  return (
    <div className="image-gallery-widget widget">
      <canvas
        id={canvasKey}
        width="100%"
        height="100%"
        style={{ contain: 'strict' }}
      />
      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
