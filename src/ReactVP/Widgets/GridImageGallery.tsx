import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';
import { GalleryImage, IGalleryImage } from './ImageGallery';

interface IGridImageGalleryProps extends WidgetProps {
  images?: IGalleryImage[];
  value?: string[];
  initialLayout?: GridLayout;
}

// Available grid layouts
type GridLayout = '1x1' | '2x2' | '4x4' | '8x8';

export function GridImageGallery({
  forWhom,
  setValue,
  images,
  initialLayout
}: IGridImageGalleryProps): JSX.Element {
  const [layout, setLayout] = useState<GridLayout>(initialLayout || '1x1');
  const [gridImages, setGridImages] = useState<IGalleryImage[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to store all canvas instances
  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const [canvasHeights, setCanvasHeights] = useState<number[]>([150]);

  // Calculate the grid dimensions based on layout
  const gridDimensions = useMemo(() => {
    const dimensions = parseInt(layout.split('x')[0], 10);
    return {
      rows: dimensions,
      cols: dimensions,
      total: dimensions * dimensions
    };
  }, [layout]);

  // Generate unique canvas keys
  const canvasKeys = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    const keys: string[] = [];
    for (let i = 0; i < gridDimensions.total; i++) {
      keys.push(`gallery-grid-${id}-${i}`);
    }
    return keys;
  }, [forWhom, gridDimensions.total]);

  // Distribute images across the grid cells
  useEffect(() => {
    if (!images) {
      setGridImages([]);
      return;
    }

    const cellCount = gridDimensions.total;
    const newGridImages: IGalleryImage[][] = [];

    // Distribute images evenly across cells
    for (let i = 0; i < cellCount; i++) {
      const cellImages = images.filter((_, index) => index % cellCount === i);
      newGridImages.push(cellImages);
    }

    setGridImages(newGridImages);
  }, [images, gridDimensions.total]);

  // Calculate scale for thumbnails
  const calculateScale = useCallback(
    (img: GalleryImage, finalThumbSize: number) => {
      return Math.min(
        finalThumbSize / img.width!,
        finalThumbSize / img.height!
      );
    },
    []
  );

  // Arrange thumbnails in each canvas
  const arrangeThumbnails = useCallback(
    (
      thumbnails: IGalleryImage[],
      canvas: fabric.Canvas,
      canvasIndex: number
    ) => {
      if (!canvas || canvas.isDisposed) {
        return;
      }

      // Remove stale objects
      canvas.getObjects().forEach(obj => {
        if (!thumbnails.some(t => t.fabricObject === obj)) {
          canvas.remove(obj);
        }
      });

      // Calculate layout with fixed 3 columns of square grids
      const padding = 10;
      const numCols = 3;

      // Use the calculation specified
      const availableWidth = canvas.width! - padding * (numCols + 1);
      const gridSize = Math.floor(availableWidth / numCols);

      let maxBottom = 0;
      const strokePadding = 2;
      thumbnails.forEach(({ fabricObject }, index) => {
        if (!fabricObject) {
          return;
        }

        const col = index % numCols;
        const row = Math.floor(index / numCols);

        // Calculate scale to fit the image in the grid
        const scale = calculateScale(
          fabricObject,
          gridSize - strokePadding * 2
        );

        const scaledWidth = fabricObject.width! * scale;
        const scaledHeight = fabricObject.height! * scale;

        // Center the image in the grid
        const leftOffset = (gridSize - scaledWidth) / 2;
        const topOffset = (gridSize - scaledHeight) / 2;

        // Calculate grid position
        const gridLeft = padding + col * (gridSize + padding);
        const gridTop = padding + row * (gridSize + padding);

        const position = {
          left: gridLeft + leftOffset,
          top: gridTop + topOffset
        };

        fabricObject.set({
          ...position,
          scaleX: scale,
          scaleY: scale,
          padding: strokePadding
        });

        if (!canvas.contains(fabricObject)) {
          canvas.add(fabricObject);
        }

        // Calculate max bottom based on grid size
        maxBottom = Math.max(
          maxBottom,
          padding + (row + 1) * (gridSize + padding)
        );
      });

      const newHeight = thumbnails.length > 0 ? maxBottom : 150;
      setCanvasHeights(prev => {
        const updated = [...prev];
        updated[canvasIndex] = newHeight;
        return updated;
      });
      canvas.setHeight(newHeight);
      canvas.renderAll();
    },
    [calculateScale]
  );

  // Load images into each canvas
  const loadImages = useCallback(
    async (
      canvas: fabric.Canvas,
      images: IGalleryImage[],
      canvasIndex: number
    ) => {
      try {
        if (!canvas || canvas.isDisposed) {
          return;
        }
        setLoading(true);
        setError(null);

        const processed = await Promise.all(
          images.map(async (img, index) => {
            const existing = canvas
              .getObjects()
              .find(
                o => (o as GalleryImage).data?.filename === img.filename
              ) as GalleryImage | undefined;

            if (existing) {
              // Update index on existing objects
              existing.data = {
                ...existing.data,
                filename: img.filename,
                originalIndex: index
              };
              return { ...img, fabricObject: existing };
            }

            const fabricImg = await new Promise<GalleryImage>(
              (resolve, reject) => {
                fabric.FabricImage.fromURL(img.base64 || img.imageUrl!)
                  .then(imgElement => {
                    const galleryImage = new GalleryImage(
                      imgElement.getElement(),
                      {
                        data: { filename: img.filename, originalIndex: index },
                        originX: 'left',
                        originY: 'top'
                      } as fabric.TOptions<fabric.ImageProps> & {
                        data?: Record<string, any>;
                      }
                    );
                    resolve(galleryImage);
                  })
                  .catch(reject);
              }
            );

            return { ...img, fabricObject: fabricImg };
          })
        );

        if (!canvas.isDisposed) {
          const container = canvas.wrapperEl;
          if (container) {
            container.classList.toggle('has-images', images.length > 0);
          }
          arrangeThumbnails(processed, canvas, canvasIndex);
        }
      } catch (err) {
        console.error('[Load] Failed:', err);
        setError('Failed to load images');
      } finally {
        if (!canvas || !canvas.isDisposed) {
          setLoading(false);
        }
      }
    },
    [arrangeThumbnails]
  );

  // Handle selection of images
  const handleSelection = useCallback(
    (
      canvasIndex: number,
      target: GalleryImage | GalleryImage[],
      shiftKey: boolean
    ) => {
      const canvas = canvasRefs.current[canvasIndex];
      if (!canvas) {
        return;
      }

      const allGalleryImages = canvas
        .getObjects()
        .filter(obj => obj instanceof GalleryImage) as GalleryImage[];
      const targetsArray = Array.isArray(target) ? target : [target];

      // Handle selection state
      if (!shiftKey) {
        // Clear selections in all canvases first
        canvasRefs.current.forEach((otherCanvas, idx) => {
          if (otherCanvas && idx !== canvasIndex) {
            otherCanvas.getObjects().forEach(obj => {
              if (obj instanceof GalleryImage) {
                obj.toggleSelection(false);
              }
            });
            otherCanvas.renderAll();
          }
        });

        allGalleryImages.forEach(img => {
          if (!targetsArray.includes(img)) {
            img.toggleSelection(false);
          }
        });
      }

      targetsArray.forEach(target => {
        target.toggleSelection(!target.selected);
      });

      // Get all selected images across all canvases
      const selectedImages: string[] = [];
      canvasRefs.current.forEach(canvas => {
        if (canvas) {
          const selected = canvas
            .getObjects()
            .filter(
              obj => obj instanceof GalleryImage && obj.selected
            ) as GalleryImage[];

          selected.forEach(img => {
            if (img.data?.filename) {
              selectedImages.push(img.data.filename);
            }
          });
        }
      });

      setValue?.(forWhom, selectedImages);
      canvas.requestRenderAll();
    },
    [setValue, forWhom]
  );

  // Setup canvas and event listeners
  useEffect(() => {
    // Initialize canvases based on layout
    const totalCanvases = gridDimensions.total;
    const currentCanvasRefs = canvasRefs.current;

    // Dispose existing canvases
    currentCanvasRefs.forEach(canvas => {
      if (canvas) {
        canvas.dispose();
      }
    });

    // Reset refs and heights
    canvasRefs.current = Array(totalCanvases).fill(null);
    setCanvasHeights(Array(totalCanvases).fill(150));

    // Initialize all canvas elements
    for (let i = 0; i < totalCanvases; i++) {
      const canvasElement = document.getElementById(canvasKeys[i]);
      if (!canvasElement) {
        continue;
      }

      while (canvasElement.firstChild) {
        canvasElement.removeChild(canvasElement.firstChild);
      }

      const parentWidth = canvasElement.parentElement?.clientWidth || 500;
      const newCanvas = new fabric.Canvas(canvasKeys[i], {
        width: parentWidth,
        height: 150,
        selection: true,
        renderOnAddRemove: false,
        selectionColor: 'transparent',
        selectionBorderColor: 'transparent',
        defaultCursor: 'default',
        hoverCursor: 'default'
      });

      if (newCanvas.wrapperEl) {
        newCanvas.wrapperEl.style.removeProperty('width');
      }

      // Set up mouse events
      newCanvas.on('mouse:down', e => {
        if (e.target && e.target instanceof GalleryImage) {
          handleSelection(i, e.target, e.e.shiftKey);
        }
      });

      canvasRefs.current[i] = newCanvas;

      // Load images for this canvas
      if (gridImages[i]) {
        loadImages(newCanvas, gridImages[i], i);
      }
    }

    // Cleanup function
    return () => {
      canvasRefs.current.forEach(canvas => {
        if (canvas) {
          canvas.getObjects().forEach(obj => canvas.remove(obj));
          canvas.dispose();
        }
      });
      canvasRefs.current = [];
    };
  }, [
    canvasKeys,
    gridDimensions.total,
    gridImages,
    handleSelection,
    loadImages
  ]);

  // Update images when gridImages change
  useEffect(() => {
    canvasRefs.current.forEach((canvas, index) => {
      if (canvas && gridImages[index]) {
        loadImages(canvas, gridImages[index], index);
      }
    });
  }, [gridImages, loadImages]);

  // Update layout when initialLayout changes
  useEffect(() => {
    if (initialLayout && initialLayout !== layout) {
      setLayout(initialLayout as GridLayout);
    }
  }, [initialLayout, layout]);

  return (
    <div className="grid-image-gallery-widget widget">
      <div className="gallery-controls">
        <select
          className="layout-selector"
          value={layout}
          onChange={e => setLayout(e.target.value as GridLayout)}
          aria-label="Grid layout selector"
        >
          <option value="1x1">Layout 1×1</option>
          <option value="2x2">Layout 2×2</option>
          <option value="4x4">Layout 4×4</option>
          <option value="8x8">Layout 8×8</option>
        </select>
      </div>

      <div
        className="gallery-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
          gap: '10px'
        }}
      >
        {canvasKeys.map((key, index) => (
          <div key={key} className="gallery-cell">
            <canvas
              id={key}
              width="100%"
              height={canvasHeights[index] || 150}
              style={{ contain: 'strict' }}
            />
          </div>
        ))}
      </div>

      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
