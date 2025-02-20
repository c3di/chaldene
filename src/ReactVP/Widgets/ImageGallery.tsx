/* eslint-disable @typescript-eslint/naming-convention */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';

declare module 'fabric' {
  interface Canvas {
    isDisposed: boolean;
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
  const selectionRef = useRef<fabric.Image | null>(null);
  const isMounted = useRef(false);

  // Stable canvas key based on forWhom ID
  const canvasKey = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    console.log('[Canvas] Generated canvas key for:', id);
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
    console.log('[Image] Creating image from:', src.substring(0, 50));
    return new Promise<fabric.Image>((resolve, reject) => {
      fabric.FabricImage.fromURL(src).then(img => {
        console.log('[Image] Created successfully');
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
              cornerColor: 'transparent'
            })
          };
        })
      );
    },
    [createFabricImage]
  );

  const updateSelection = useCallback((selected?: fabric.Image) => {
    console.log('[Selection] Updating visual');
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    // Clear previous selection
    if (selectionRef.current) {
      selectionRef.current.set({
        borderColor: 'transparent',
        cornerColor: 'transparent'
      });
      console.log('[Selection] Cleared previous');
    }

    // Apply new selection
    if (selected) {
      selected.set({
        borderColor: '#2196f3',
        cornerColor: '#2196f3',
        borderScaleFactor: 2
      });
      selectionRef.current = selected;
      console.log('[Selection] Applied new');
    }

    canvas.requestRenderAll();
  }, []);

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
            left: col * (calculatedThumbSize + padding),
            top: row * (scaledHeight + padding)
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
      console.log('[Load] Starting load for', images.length, 'images');
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
        console.log('[Load] Completed successfully');
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
    console.log('[Canvas] Mounting');
    isMounted.current = true;
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
    const parentHeight = 300; // Fixed height or calculate from parent

    const newCanvas = new fabric.Canvas(canvasKey, {
      width: parentWidth,
      height: parentHeight,
      selection: true,
      renderOnAddRemove: false
    });

    canvasRef.current = newCanvas;
    console.log('[Canvas] Initialized');

    // Load initial images
    if (stableImages) {
      loadImages(newCanvas, stableImages);
    }

    // Selection handlers
    const handleSelection = (e?: { selected?: fabric.Object[] }) => {
      const selected = e?.selected?.[0] as fabric.Image | undefined;
      console.log('[Selection] Detected:', selected?.data?.filename);
      setValue?.(forWhom, selected ? [selected.data?.filename || ''] : []);
      updateSelection(selected);
    };

    newCanvas.on('selection:created', handleSelection);
    newCanvas.on('selection:updated', handleSelection);

    return () => {
      console.log('[Canvas] Unmounting');
      isMounted.current = false;

      if (newCanvas) {
        console.log('[Canvas] Disposing');
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
    console.log('[Images] Update detected');
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
