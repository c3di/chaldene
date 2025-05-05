import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';
import { GalleryImage, IGalleryImage } from './ImageGallery';

interface IGridImageGalleryProps extends WidgetProps {
  images?: IGalleryImage[];
  value?: string[];
  initialLayout?: GridLayout;
}

type GridLayout = string;

export function GridImageGallery({
  forWhom,
  setValue,
  images,
  initialLayout
}: IGridImageGalleryProps): JSX.Element {
  const [rows, setRows] = useState<number>(1);
  const [cols, setCols] = useState<number>(1);
  const [rowsInput, setRowsInput] = useState<string>('1');
  const [colsInput, setColsInput] = useState<string>('1');
  const [gridImages, setGridImages] = useState<IGalleryImage[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to store all canvas instances
  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const [canvasHeights, setCanvasHeights] = useState<number[]>([150]);
  // Track initialization state to prevent double initialization
  const isInitializing = useRef(false);
  // Debounce timeout for inputs
  const debounceTimeout = useRef<number | null>(null);

  // Clear debounce timeout
  const clearDebounce = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
  }, []);

  // Get the current layout string
  const getCurrentLayout = useCallback(() => {
    return `${rows}x${cols}`;
  }, [rows, cols]);

  // Initialize rows and cols from initialLayout only on first render
  useEffect(() => {
    if (initialLayout) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      const initialRows = parseInt(rowsStr, 10) || 1;
      const initialCols = parseInt(colsStr, 10) || 1;
      setRows(initialRows);
      setCols(initialCols);
      setRowsInput(initialRows.toString());
      setColsInput(initialCols.toString());
    }
  }, []);

  // Calculate the grid dimensions based on rows and cols
  const gridDimensions = useMemo(() => {
    return {
      rows,
      cols,
      total: rows * cols
    };
  }, [rows, cols]);

  // Handle row input change
  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setRowsInput(inputValue);

    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 8) {
      setRows(parsed);
    }
  };

  // Handle column input change
  const handleColsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setColsInput(inputValue);

    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 8) {
      setCols(parsed);
    }
  };

  // Handle blur event for input validation
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    isRow: boolean
  ) => {
    const value = parseInt(e.target.value, 10);

    // If empty or invalid, reset to the last valid value
    if (isNaN(value) || value < 1 || value > 8) {
      if (isRow) {
        setRowsInput(rows.toString());
      } else {
        setColsInput(cols.toString());
      }
    }
  };

  // Clean up debounce on unmount
  useEffect(() => clearDebounce, [clearDebounce]);

  // Generate unique canvas keys for the maximum possible layout
  const canvasKeys = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    const keys: string[] = [];

    const maxCells = 16; // 4x4
    for (let i = 0; i < maxCells; i++) {
      keys.push(`gallery-grid-${id}-${i}`);
    }
    return keys;
  }, [forWhom]);

  // Distribute images across the grid cells
  useEffect(() => {
    if (!images) {
      setGridImages([]);
      return;
    }

    const cellCount = gridDimensions.total;
    const newGridImages: IGalleryImage[][] = [];

    for (let i = 0; i < cellCount; i++) {
      // For all cells, assign a single image if available
      const image = i < images.length ? images[i] : null;
      newGridImages.push(image ? [image] : []);
    }

    setGridImages(newGridImages);
  }, [images, gridDimensions.total]);

  // Arrange thumbnails in each canvas
  const arrangeThumbnails = useCallback(
    (
      thumbnails: IGalleryImage[],
      canvas: fabric.Canvas,
      canvasIndex: number
    ) => {
      if (!canvas || canvas.isDisposed) {
        console.error(
          '[GridImageGallery] Canvas is null or disposed in arrangeThumbnails'
        );
        return;
      }

      try {
        // Clear canvas first to ensure clean state
        canvas.clear();

        // Get canvas dimensions
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();

        console.log(
          `[GridImageGallery] Arranging ${thumbnails.length} images on canvas ${canvasIndex} (${canvasWidth}x${canvasHeight})`
        );

        // Make sure the upper canvas is transparent
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.background = 'transparent';
          canvas.upperCanvasEl.style.backgroundColor = 'transparent';
        }

        // Use first image as background - similar to ImageViewerN approach
        if (thumbnails.length > 0 && thumbnails[0].fabricObject) {
          const fabricObject = thumbnails[0].fabricObject;

          // Calculate scale to fit in canvas
          const originalWidth = fabricObject.width || 100;
          const originalHeight = fabricObject.height || 100;

          const scaleX = canvasWidth / originalWidth;
          const scaleY = canvasHeight / originalHeight;
          const scale = Math.min(scaleX, scaleY);

          console.log(
            `[GridImageGallery] Scaling image to ${scale} for canvas ${canvasIndex}`
          );

          // Set the image as the background image (similar to ImageViewerN)
          fabricObject.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            selectable: true
          });

          // Double-ensure image visibility by forcing it to be placed on the lower canvas directly
          const lowerCanvas = canvas.lowerCanvasEl;
          if (lowerCanvas) {
            // Force the image to show on lower canvas using css background
            const imgElement = fabricObject.getElement();
            if (
              imgElement &&
              imgElement instanceof HTMLImageElement &&
              imgElement.src
            ) {
              try {
                console.log(
                  `[GridImageGallery] Setting CSS background on lower canvas for ${canvasIndex}`
                );
                lowerCanvas.style.backgroundImage = `url('${imgElement.src}')`;
                lowerCanvas.style.backgroundPosition = 'center';
                lowerCanvas.style.backgroundRepeat = 'no-repeat';
                lowerCanvas.style.backgroundSize = 'contain';
              } catch (e) {
                console.error(
                  '[GridImageGallery] Failed to set CSS background:',
                  e
                );
              }
            }
          }

          // Set as background image (this is how ImageViewerN does it)
          canvas.backgroundImage = fabricObject;
          console.log(
            `[GridImageGallery] Set as background image for canvas ${canvasIndex}`
          );
        }

        // Immediately render to display changes
        canvas.renderAll();
        console.log(
          `[GridImageGallery] Canvas ${canvasIndex} rendered with ${canvas.getObjects().length} objects`
        );
      } catch (err) {
        console.error('[GridImageGallery] Error in arrangeThumbnails:', err);
      }
    },
    []
  );

  // Update the loadImages function to ensure images are rendered
  const loadImages = useCallback(
    async (
      canvas: fabric.Canvas,
      images: IGalleryImage[],
      canvasIndex: number
    ) => {
      try {
        if (!canvas || canvas.isDisposed) {
          console.error('[GridImageGallery] Canvas is null or disposed');
          return;
        }

        console.log(
          `[GridImageGallery] Loading ${images.length} images into canvas ${canvasIndex}`
        );
        console.log(
          '[GridImageGallery] Image data:',
          images.map(img => ({
            filename: img.filename,
            hasBase64: !!img.base64,
            hasImageUrl: !!img.imageUrl,
            base64Preview: img.base64
              ? img.base64.substring(0, 50) + '...'
              : 'none'
          }))
        );

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

            console.log(
              `[GridImageGallery] Creating new fabric image for ${img.filename}`
            );

            try {
              // First check if we have valid image data
              if (!img.base64 && !img.imageUrl) {
                console.error(
                  `[GridImageGallery] No image data for ${img.filename}`
                );
                return { ...img }; // Return without fabricObject
              }

              const imageSource = img.base64 || img.imageUrl!;
              // Create a native Image first to verify it loads
              const imgElement = new Image();

              // Wrap image loading in a promise for easier handling
              const fabricImg = await new Promise<GalleryImage>(
                (resolve, reject) => {
                  imgElement.onload = () => {
                    console.log(
                      `[GridImageGallery] Image loaded successfully: ${imgElement.width}x${imgElement.height}`
                    );

                    try {
                      // Use fabric.Image directly (not GalleryImage) for better compatibility
                      const image = new fabric.Image(imgElement, {
                        left: 0,
                        top: 0,
                        originX: 'center',
                        originY: 'center',
                        selectable: true,
                        hasControls: false,
                        hasBorders: true,
                        borderColor: '#2196F3',
                        data: { filename: img.filename, originalIndex: index },
                        evented: true,
                        opacity: 1,
                        visible: true
                      });

                      // Enable better image rendering
                      if (
                        image.getElement() &&
                        image.getElement() instanceof HTMLImageElement
                      ) {
                        image.getElement().style.imageRendering =
                          'high-quality';
                      }

                      console.log(
                        `[GridImageGallery] Successfully created image for ${img.filename}`
                      );

                      // Apply any additional settings needed for visibility
                      // No need to set properties that don't exist

                      // Cast to GalleryImage to maintain compatibility
                      resolve(image as unknown as GalleryImage);
                    } catch (error) {
                      console.error(
                        '[GridImageGallery] Error creating image:',
                        error
                      );
                      reject(error);
                    }
                  };

                  imgElement.onerror = e => {
                    console.error(
                      `[GridImageGallery] Failed to load image ${img.filename}:`,
                      e
                    );
                    reject(new Error(`Failed to load image ${img.filename}`));
                  };

                  // Set source last to trigger loading
                  imgElement.src = imageSource;
                }
              );

              return { ...img, fabricObject: fabricImg };
            } catch (imgError) {
              console.error(
                `[GridImageGallery] Error processing image ${img.filename}:`,
                imgError
              );
              return { ...img }; // Return without fabricObject if it fails
            }
          })
        );

        if (!canvas.isDisposed) {
          const container = canvas.wrapperEl;
          if (container) {
            container.classList.toggle('has-images', images.length > 0);
            // Make sure the canvas container is visible
            container.style.display = 'block';
            container.style.visibility = 'visible';
          }

          console.log(
            `[GridImageGallery] Arranging ${processed.length} processed images in canvas ${canvasIndex}`
          );
          arrangeThumbnails(processed, canvas, canvasIndex);
        }
      } catch (err) {
        console.error('[GridImageGallery] Load Failed:', err);
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
    // If already initializing, skip this cycle
    if (isInitializing.current) {
      console.log(
        '[GridImageGallery] Initialization already in progress, skipping'
      );
      return;
    }

    isInitializing.current = true;

    // Initialize canvases based on layout
    const totalCanvases = gridDimensions.total;

    // Dispose existing canvases properly
    const currentCanvasRefs = canvasRefs.current;
    currentCanvasRefs.forEach((canvas, index) => {
      if (canvas) {
        try {
          console.log(`[GridImageGallery] Disposing canvas ${index}`);
          // First remove all objects to avoid memory leaks
          canvas.getObjects().forEach(obj => canvas.remove(obj));
          canvas.dispose();
          // Null the reference to indicate it's been disposed
          canvasRefs.current[index] = null;
        } catch (error) {
          console.error(
            `[GridImageGallery] Error disposing canvas ${index}:`,
            error
          );
        }
      }
    });

    // Reset heights with current layout dimensions
    const maxCanvases = 16; // 4x4
    canvasRefs.current = Array(maxCanvases).fill(null);

    // Set consistent height for all canvases
    const canvasHeight = 250;
    setCanvasHeights(prev => {
      const newHeights = [...prev];
      // Update heights for all canvases
      for (let i = 0; i < maxCanvases; i++) {
        newHeights[i] = canvasHeight;
      }
      return newHeights;
    });

    // Add a small delay to ensure DOM is ready and previous cleanup is complete
    const initTimeout = setTimeout(() => {
      for (let i = 0; i < totalCanvases; i++) {
        const canvasElement = document.getElementById(canvasKeys[i]);
        if (!canvasElement) {
          console.error(
            `[GridImageGallery] Canvas element not found for ID: ${canvasKeys[i]}`
          );
          continue;
        }

        // Verify this canvas hasn't already been initialized
        if (canvasRefs.current[i]) {
          console.log(
            `[GridImageGallery] Canvas ${i} already initialized, skipping`
          );
          continue;
        }

        // Clean up canvas element to ensure a fresh start
        while (canvasElement.firstChild) {
          canvasElement.removeChild(canvasElement.firstChild);
        }

        // Get parent width or use default
        const parentWidth = canvasElement.parentElement?.clientWidth || 500;

        try {
          console.log(
            `[GridImageGallery] Initializing canvas ${i} with element`,
            canvasElement
          );

          // Get parent width accounting for padding and borders correctly
          const parentElement = canvasElement.parentElement;
          const parentStyle = parentElement
            ? window.getComputedStyle(parentElement)
            : null;

          // Calculate the actual inner width available for the canvas
          let actualParentWidth = parentWidth;
          if (parentStyle && parentElement) {
            const parentRect = parentElement.getBoundingClientRect();
            actualParentWidth = parentRect.width;
            // Remove border and padding to get the exact content area size
            actualParentWidth -=
              parseFloat(parentStyle.paddingLeft) +
              parseFloat(parentStyle.paddingRight) +
              parseFloat(parentStyle.borderLeftWidth) +
              parseFloat(parentStyle.borderRightWidth);
          }

          // Add additional logging
          console.log(`[GridImageGallery] Canvas ${i} dimensions:`, {
            parentWidth,
            actualParentWidth,
            canvasHeight
          });

          // Create the canvas with responsive dimensions
          const newCanvas = new fabric.Canvas(canvasElement.id, {
            width: canvasElement.parentElement?.clientWidth || parentWidth,
            height: canvasHeight,
            selection: true,
            renderOnAddRemove: true,
            selectionColor: 'transparent',
            selectionBorderColor: 'transparent',
            defaultCursor: 'default',
            hoverCursor: 'default',
            preserveObjectStacking: true,
            backgroundColor: '#f9f9f9',
            imageSmoothingEnabled: true // Enable image smoothing
          });

          // Apply DPI scaling for high-resolution displays
          const dpr = window.devicePixelRatio || 1;
          if (dpr > 1) {
            const scaleFactor = dpr;
            const canvasEl = newCanvas.getElement();
            canvasEl.width =
              (canvasElement.parentElement?.clientWidth || parentWidth) *
              scaleFactor;
            canvasEl.height = canvasHeight * scaleFactor;

            // Scale the context to ensure correct display
            const ctx = canvasEl.getContext('2d');
            if (ctx) {
              ctx.scale(scaleFactor, scaleFactor);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
            }
          }

          // Make upper canvas transparent
          if (newCanvas.upperCanvasEl) {
            newCanvas.upperCanvasEl.style.background = 'transparent';
            newCanvas.upperCanvasEl.style.backgroundColor = 'transparent';
          }

          // Set appropriate CSS to ensure the canvas container is sized correctly
          if (newCanvas.wrapperEl) {
            newCanvas.wrapperEl.style.width = '100%';
            newCanvas.wrapperEl.style.height = `${canvasHeight}px`;
            newCanvas.wrapperEl.style.position = 'relative';
            newCanvas.wrapperEl.style.display = 'block';
            newCanvas.wrapperEl.style.boxSizing = 'border-box';
          }

          // Set CSS for the lower canvas
          const lowerCanvasEl = newCanvas.getElement();
          if (lowerCanvasEl) {
            lowerCanvasEl.style.width = '100%';
            lowerCanvasEl.style.height = '100%';
            lowerCanvasEl.style.boxSizing = 'border-box';
          }

          // Use flexible dimensions
          newCanvas.setDimensions({ width: '100%', height: canvasHeight });

          // Set up mouse events
          newCanvas.on('mouse:down', e => {
            if (e.target && e.target instanceof GalleryImage) {
              handleSelection(i, e.target, e.e.shiftKey);
            }
          });

          // Store the canvas reference
          canvasRefs.current[i] = newCanvas;
          console.log(
            `[GridImageGallery] Canvas ${i} initialized successfully`
          );

          // Load images for this canvas if available
          if (gridImages[i] && gridImages[i].length > 0) {
            console.log(
              `[GridImageGallery] Loading initial images for canvas ${i}:`,
              gridImages[i].length
            );
            loadImages(newCanvas, gridImages[i], i);
          }
        } catch (error) {
          console.error(
            `[GridImageGallery] Error initializing canvas ${i}:`,
            error
          );
          // Make sure to null out the reference if initialization fails
          canvasRefs.current[i] = null;
        }
      }

      // Reset the initializing flag when done
      isInitializing.current = false;
    }, 150);

    // Cleanup function
    return () => {
      console.log('[GridImageGallery] Cleaning up canvases');
      // Clear the timeout to prevent initializing after unmount
      clearTimeout(initTimeout);

      // Set initializing to false to allow future initialization
      isInitializing.current = false;

      // Properly dispose all canvases
      canvasRefs.current.forEach((canvas, index) => {
        if (canvas) {
          try {
            console.log(
              `[GridImageGallery] Disposing canvas ${index} during cleanup`
            );
            canvas.getObjects().forEach(obj => canvas.remove(obj));
            canvas.dispose();
          } catch (error) {
            console.error('[GridImageGallery] Error disposing canvas:', error);
          }
        }
      });
      canvasRefs.current = [];
    };
  }, [
    canvasKeys,
    gridDimensions.total,
    gridImages,
    handleSelection,
    loadImages,
    getCurrentLayout
  ]);

  // Update images when gridImages change
  useEffect(() => {
    console.log('[GridImageGallery] GridImages changed, updating canvases');

    canvasRefs.current.forEach((canvas, index) => {
      if (canvas && !canvas.isDisposed && gridImages[index]) {
        console.log(
          `[GridImageGallery] Updating canvas ${index} with ${gridImages[index].length} images`
        );

        // Clear any previous images from the canvas
        const existingObjects = canvas.getObjects();
        if (existingObjects.length > 0) {
          console.log(
            `[GridImageGallery] Clearing ${existingObjects.length} existing objects from canvas ${index}`
          );
          canvas.clear();
        }

        // Force a small timeout to ensure the canvas is ready
        setTimeout(() => {
          loadImages(canvas, gridImages[index], index);
        }, 50);
      } else if (canvas && !gridImages[index]) {
        // If there are no images for this canvas, clear it
        console.log(
          `[GridImageGallery] No images for canvas ${index}, clearing`
        );
        canvas.clear();
        canvas.renderAll();
      }
    });
  }, [gridImages, loadImages]);

  // Update layout when initialLayout changes
  useEffect(() => {
    if (initialLayout && initialLayout !== getCurrentLayout()) {
      setRows(parseInt(initialLayout.split('x')[0], 10) || 1);
      setCols(parseInt(initialLayout.split('x')[1], 10) || 1);
    }
  }, [initialLayout, getCurrentLayout]);

  // Update when initialLayout changes (for external control)
  useEffect(() => {
    if (initialLayout) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      const newRows = parseInt(rowsStr, 10) || 1;
      const newCols = parseInt(colsStr, 10) || 1;

      // Only update if there's an actual change
      if (newRows !== rows || newCols !== cols) {
        setRows(newRows);
        setCols(newCols);
        setRowsInput(newRows.toString());
        setColsInput(newCols.toString());
      }
    }
  }, [initialLayout, rows, cols]);

  // Add global CSS rule for upper canvas in the component
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.type = 'text/css';
    styleEl.innerHTML = `
      .grid-image-gallery-widget .upper-canvas {
        background: transparent !important;
        background-color: transparent !important;
        pointer-events: none !important;
      }
      
      .grid-image-gallery-widget .lower-canvas {
        z-index: 1 !important;
      }
    `;

    // Add it to the document head
    document.head.appendChild(styleEl);

    // Clean up on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <div
      className={`grid-image-gallery-widget widget layout-${getCurrentLayout()}`}
    >
      <div className="gallery-controls">
        <div className="layout-inputs">
          <input
            id="grid-rows"
            type="number"
            min="1"
            max="8"
            value={rowsInput}
            onChange={handleRowsChange}
            onBlur={e => handleBlur(e, true)}
            aria-label="Grid rows"
            className="layout-input"
          />
          <span className="layout-separator">×</span>
          <input
            id="grid-cols"
            type="number"
            min="1"
            max="8"
            value={colsInput}
            onChange={handleColsChange}
            onBlur={e => handleBlur(e, false)}
            aria-label="Grid columns"
            className="layout-input"
          />
        </div>
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
          <div
            key={key}
            className={`gallery-cell cell-${index}`}
            style={{
              // Only display cells that fit within the current layout
              display: index < gridDimensions.total ? 'block' : 'none'
            }}
          >
            <canvas
              id={key}
              width="100%"
              height={canvasHeights[index] || 150}
              style={{
                contain: 'strict',
                border: '1px solid #eee',
                borderRadius: '4px',
                background: '#f9f9f9',
                display: 'block',
                width: '100%',
                height: '100%'
              }}
            />
          </div>
        ))}
      </div>

      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
