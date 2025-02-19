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
  const thumbnailSize = 100;
  const padding = 10;

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

  const calculateScale = useCallback((img: fabric.Image) => {
    const scale = Math.min(
      thumbnailSize / img.width!,
      thumbnailSize / img.height!
    );
    console.log('[Scale] Calculated:', scale);
    return scale;
  }, []);

  const processImages = useCallback(
    async (images: IGalleryImage[]) => {
      console.log('[Process] Starting processing for', images.length, 'images');
      const currentObjects = canvasRef.current?.getObjects() || [];

      return Promise.all(
        images.map(async img => {
          const existing = currentObjects.find(
            o => (o as fabric.Image).data?.filename === img.filename
          ) as fabric.Image | undefined;

          if (existing) {
            console.log('[Process] Reusing existing:', img.filename);
            return { ...img, fabricObject: existing };
          }

          console.log('[Process] Creating new:', img.filename);
          const fabricImg = await createFabricImage(
            img.base64 || img.imageUrl!
          );
          return {
            ...img,
            fabricObject: fabricImg.set({
              scaleX: calculateScale(fabricImg),
              scaleY: calculateScale(fabricImg),
              data: { filename: img.filename }
            })
          };
        })
      );
    },
    [createFabricImage, calculateScale]
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
        console.log('[Arrange] Starting for', thumbnails.length, 'items');
        if (canvas.isDisposed) {
          return;
        }

        const currentObjects = canvas.getObjects();
        console.log('[Arrange] Current objects:', currentObjects.length);

        // Remove obsolete objects
        currentObjects.forEach(obj => {
          if (!thumbnails.some(t => t.fabricObject === obj)) {
            console.log(
              '[Arrange] Removing:',
              (obj as fabric.Image).data?.filename
            );
            canvas.remove(obj);
          }
        });

        // Add/update objects
        thumbnails.forEach(({ fabricObject }, index) => {
          if (!fabricObject) {
            return;
          }

          const position = {
            left: (index % 4) * (thumbnailSize + padding) + padding,
            top: Math.floor(index / 4) * (thumbnailSize + padding) + padding
          };

          if (!canvas.contains(fabricObject)) {
            console.log('[Arrange] Adding:', fabricObject.data?.filename);
            fabricObject.set(position);
            canvas.add(fabricObject);
          } else {
            console.log(
              '[Arrange] Updating position:',
              fabricObject.data?.filename
            );
            fabricObject.set(position);
          }
        });

        canvas.renderAll();
        console.log('[Arrange] Final count:', canvas.getObjects().length);
      } catch (error) {
        console.error('[Arrange] Error:', error);
      }
    },
    [thumbnailSize, padding]
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

    const newCanvas = new fabric.Canvas(canvasKey, {
      width: 500,
      height: 300,
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
        width={500}
        height={300}
        style={{ contain: 'strict' }}
      />
      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
