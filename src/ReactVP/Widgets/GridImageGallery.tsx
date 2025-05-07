import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';
import { GalleryImage, IGalleryImage } from './ImageGallery';
import { LeftArrowIcon, RightArrowIcon } from '../Style';

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
  // Replace separate row/col states with a layout tuple
  const [layout, setLayout] = useState<[number, number]>([1, 1]);
  const [layoutInput, setLayoutInput] = useState<[string, string]>(['1', '1']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{
    row?: string;
    col?: string;
  }>({});
  const [cellHeight, setCellHeight] = useState<number>(300);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const isInitializing = useRef(false);
  const debounceTimeout = useRef<number | null>(null);

  const clearDebounce = useCallback(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
  }, []);

  // Get the current layout string
  const getCurrentLayout = useCallback(() => {
    return `${layout[0]}x${layout[1]}`;
  }, [layout]);

  // Calculate total pages for navigation
  const totalPages = useMemo(() => {
    if (!images) {
      return 1;
    }
    const imagesPerPage = layout[0] * layout[1];
    return Math.ceil(images.length / imagesPerPage);
  }, [images, layout]);

  // Handle navigation between pages
  const handleNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev' && currentPage > 0) {
        setCurrentPage(prev => prev - 1);
      } else if (direction === 'next' && currentPage < totalPages - 1) {
        setCurrentPage(prev => prev + 1);
      }
    },
    [currentPage, totalPages]
  );

  // Check if navigation buttons should be disabled
  const isNavButtonDisabled = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        return currentPage === 0;
      }
      return currentPage >= totalPages - 1;
    },
    [currentPage, totalPages]
  );

  // Initialize rows and cols from initialLayout only on first render
  useEffect(() => {
    if (initialLayout) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      const initialRows = parseInt(rowsStr, 10) || 1;
      const initialCols = parseInt(colsStr, 10) || 1;
      setLayout([initialRows, initialCols]);
      setLayoutInput([initialRows.toString(), initialCols.toString()]);
    }
  }, []);

  // Calculate the grid dimensions based on layout
  const gridDimensions = useMemo(() => {
    return {
      rows: layout[0],
      cols: layout[1],
      total: layout[0] * layout[1]
    };
  }, [layout]);

  // Combined handler for both row and column input changes
  const handleLayoutChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    dimension: 'row' | 'col'
  ) => {
    const inputValue = e.target.value;
    const index = dimension === 'row' ? 0 : 1;

    // Update input state
    const newLayoutInput = [...layoutInput];
    newLayoutInput[index] = inputValue;
    setLayoutInput(newLayoutInput as [string, string]);

    // Parse and validate
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 4) {
      // Valid input, update layout
      const newLayout = [...layout];
      newLayout[index] = parsed;
      setLayout(newLayout as [number, number]);
      // Reset to first page when layout changes
      setCurrentPage(0);

      // Clear validation error
      setValidationError(prev => ({
        ...prev,
        [dimension]: undefined
      }));
    } else if (!isNaN(parsed)) {
      // Invalid number, show error
      setValidationError(prev => ({
        ...prev,
        [dimension]: `${dimension === 'row' ? 'Rows' : 'Columns'} must be between 1 and 4`
      }));
    }
  };

  // Combined handler for blur events
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    dimension: 'row' | 'col'
  ) => {
    const value = parseInt(e.target.value, 10);
    const index = dimension === 'row' ? 0 : 1;

    // If empty or invalid, reset to the last valid value
    if (isNaN(value) || value < 1 || value > 4) {
      const newLayoutInput = [...layoutInput];
      newLayoutInput[index] = layout[index].toString();
      setLayoutInput(newLayoutInput as [string, string]);

      // Clear validation error
      setValidationError(prev => ({
        ...prev,
        [dimension]: undefined
      }));
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

  // Distribute images across the grid cells with pagination
  const gridImages = useMemo(() => {
    if (!images) {
      return [];
    }

    const cellCount = gridDimensions.total;
    const newGridImages: IGalleryImage[][] = [];

    // Calculate starting index based on current page
    const startIndex = currentPage * cellCount;

    for (let i = 0; i < cellCount; i++) {
      const imageIndex = startIndex + i;
      // For all cells, assign a single image if available
      const image = imageIndex < images.length ? images[imageIndex] : null;
      newGridImages.push(image ? [image] : []);
    }

    return newGridImages;
  }, [images, gridDimensions.total, currentPage]);

  // Arrange thumbnails in each canvas
  const arrangeThumbnails = useCallback(
    (thumbnails: IGalleryImage[], canvas: fabric.Canvas) => {
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

        // Make sure the upper canvas is transparent
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.background = 'transparent';
          canvas.upperCanvasEl.style.backgroundColor = 'transparent';
        }

        if (thumbnails.length > 0 && thumbnails[0].fabricObject) {
          const fabricObject = thumbnails[0].fabricObject;

          // Calculate scale to fit in canvas
          const originalWidth = fabricObject.width || 100;
          const originalHeight = fabricObject.height || 100;

          const scaleX = canvasWidth / originalWidth;
          const scaleY = canvasHeight / originalHeight;
          const scale = Math.min(scaleX, scaleY);

          // Set the image as the background image
          fabricObject.set({
            scaleX: scale,
            scaleY: scale,
            originX: 'center',
            originY: 'center',
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            selectable: true
          });

          canvas.add(fabricObject);
        }

        // Immediately render to display changes
        canvas.renderAll();
      } catch (err) {
        console.error('[GridImageGallery] Error in arrangeThumbnails:', err);
      }
    },
    []
  );

  const createImageObject = useCallback(
    async (img: IGalleryImage, index: number): Promise<IGalleryImage> => {
      if (!img.base64 && !img.imageUrl) {
        return { ...img }; // Return without fabricObject
      }

      try {
        const imageSource = img.base64 || img.imageUrl!;
        // Create a promise-based image loader
        const fabricImg = await new Promise<fabric.Image>((resolve, reject) => {
          const imgElement = new Image();

          imgElement.onload = () => {
            try {
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
              if (image.getElement() instanceof HTMLImageElement) {
                image.getElement().style.imageRendering = 'high-quality';
              }

              resolve(image);
            } catch (error) {
              reject(error);
            }
          };

          imgElement.onerror = () => {
            reject(new Error(`Failed to load image ${img.filename}`));
          };

          // Set source last to trigger loading
          imgElement.src = imageSource;
        });

        return { ...img, fabricObject: fabricImg as unknown as GalleryImage };
      } catch (error) {
        return { ...img }; // Return without fabricObject if loading fails
      }
    },
    []
  );

  const loadImages = useCallback(
    async (canvas: fabric.Canvas, images: IGalleryImage[]) => {
      if (!canvas || canvas.isDisposed) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const existingObjects = new Map<string, GalleryImage>();
        canvas.getObjects().forEach(obj => {
          const galleryObj = obj as GalleryImage;
          if (galleryObj.data?.filename) {
            existingObjects.set(galleryObj.data.filename, galleryObj);
          }
        });

        const processed = await Promise.all(
          images.map(async (img, index) => {
            // Check for existing image
            const existing = existingObjects.get(img.filename);
            if (existing) {
              existing.data = {
                ...existing.data,
                filename: img.filename,
                originalIndex: index
              };
              return { ...img, fabricObject: existing };
            }

            return createImageObject(img, index);
          })
        );

        if (!canvas.isDisposed) {
          if (canvas.wrapperEl) {
            canvas.wrapperEl.classList.toggle('has-images', images.length > 0);
            canvas.wrapperEl.style.display = 'block';
            canvas.wrapperEl.style.visibility = 'visible';
          }

          arrangeThumbnails(processed, canvas);
        }
      } catch (err) {
        setError('Failed to load images');
      } finally {
        if (!canvas.isDisposed) {
          setLoading(false);
        }
      }
    },
    [arrangeThumbnails, createImageObject]
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

  // Function to calculate cell size based on container width and column count
  const calculateCellSize = useCallback(
    (
      containerWidth: number,
      columns: number,
      rows: number,
      images?: IGalleryImage[][]
    ) => {
      const gapSpace = (columns - 1) * 10;
      const cellWidth = (containerWidth - gapSpace) / columns;
      let cellHeight = cellWidth; // Default is square

      // For vertical layouts (Nx1) where N > 1, make cells shorter to fit on screen
      if (columns === 1 && rows > 1) {
        // Use a more dramatic height reduction for tall layouts
        switch (rows) {
          case 2:
            cellHeight = Math.min(250, cellWidth * 0.5);
            break;
          case 3:
            cellHeight = Math.min(180, cellWidth * 0.4);
            break;
          case 4:
            cellHeight = Math.min(150, cellWidth * 0.3);
            break;
          default:
            cellHeight = Math.min(200, cellWidth * 0.6);
        }
      }
      // For layouts with more rows than columns, but not single-column or 1x1
      else if (rows > columns && !(rows === 1 && columns === 1)) {
        const heightRatio = Math.max(0.4, 1 - (rows - columns) * 0.2);
        cellHeight = Math.min(200, cellWidth * heightRatio);
      }

      setCellHeight(cellHeight);
      return cellHeight;
    },
    []
  );

  // Setup canvas and event listeners
  useEffect(() => {
    // If already initializing, skip this cycle
    if (isInitializing.current) {
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
          canvas.getObjects().forEach(obj => canvas.remove(obj));
          canvas.dispose();
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

    // Add a small delay to ensure DOM is ready and previous cleanup is complete
    const initTimeout = setTimeout(() => {
      // Get the container element to measure available width
      const gridContainer = document.querySelector('.gallery-grid');
      const containerWidth = gridContainer
        ? gridContainer.clientWidth
        : window.innerWidth * 0.9;

      // Calculate dynamic cell height based on container width, column count, and layout
      const cellHeight = calculateCellSize(
        containerWidth,
        gridDimensions.cols,
        gridDimensions.rows,
        gridImages
      );

      for (let i = 0; i < totalCanvases; i++) {
        const canvasElement = document.getElementById(canvasKeys[i]);
        if (!canvasElement) {
          continue;
        }

        // Verify this canvas hasn't already been initialized
        if (canvasRefs.current[i]) {
          continue;
        }

        // Clean up canvas element to ensure a fresh start
        while (canvasElement.firstChild) {
          canvasElement.removeChild(canvasElement.firstChild);
        }

        // Get parent width or use default
        const parentWidth = canvasElement.parentElement?.clientWidth || 500;

        try {
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

          // Create the canvas with responsive dimensions
          const newCanvas = new fabric.Canvas(canvasElement.id, {
            width: canvasElement.parentElement?.clientWidth || parentWidth,
            height: cellHeight, // Use dynamic height
            selection: true,
            renderOnAddRemove: true,
            selectionColor: 'transparent',
            selectionBorderColor: 'transparent',
            defaultCursor: 'default',
            hoverCursor: 'default',
            preserveObjectStacking: true,
            backgroundColor: '#f9f9f9',
            imageSmoothingEnabled: true,
            enableRetinaScaling: true
          });

          // Make upper canvas transparent
          if (newCanvas.upperCanvasEl) {
            newCanvas.upperCanvasEl.style.background = 'transparent';
            newCanvas.upperCanvasEl.style.backgroundColor = 'transparent';
          }

          // Set appropriate CSS to ensure the canvas container is sized correctly
          if (newCanvas.wrapperEl) {
            newCanvas.wrapperEl.style.width = '100%';
            newCanvas.wrapperEl.style.height = `${cellHeight}px`;
            newCanvas.wrapperEl.style.position = 'relative';
            newCanvas.wrapperEl.style.display = 'block';
            newCanvas.wrapperEl.style.boxSizing = 'border-box';
          }

          // Set CSS for the lower canvas to ensure proper sizing
          const lowerCanvasEl = newCanvas.getElement();
          if (lowerCanvasEl) {
            lowerCanvasEl.style.boxSizing = 'border-box';
            lowerCanvasEl.style.width = '100%';
            lowerCanvasEl.style.height = '100%';
          }

          newCanvas.setDimensions({
            width: actualParentWidth,
            height: cellHeight // Use dynamic height
          });

          // Set up mouse events
          newCanvas.on('mouse:down', e => {
            if (e.target && e.target instanceof GalleryImage) {
              handleSelection(i, e.target, e.e.shiftKey);
            }
          });

          // Store the canvas reference
          canvasRefs.current[i] = newCanvas;

          // Load images for this canvas if available
          if (gridImages[i] && gridImages[i].length > 0) {
            loadImages(newCanvas, gridImages[i]);
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
      // Clear the timeout to prevent initializing after unmount
      clearTimeout(initTimeout);

      // Set initializing to false to allow future initialization
      isInitializing.current = false;

      // Properly dispose all canvases
      canvasRefs.current.forEach((canvas, index) => {
        if (canvas) {
          try {
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
    gridDimensions.cols, // Add columns as dependency since it affects cell size
    gridDimensions.rows, // Add rows as dependency
    gridImages,
    handleSelection,
    loadImages,
    getCurrentLayout,
    calculateCellSize, // Add new dependency
    setCellHeight // Add as dependency since we use it in calculateCellSize
  ]);

  // Update images when gridImages change
  useEffect(() => {
    canvasRefs.current.forEach((canvas, index) => {
      if (canvas && !canvas.isDisposed && gridImages[index]) {
        setTimeout(() => {
          loadImages(canvas, gridImages[index]);
        }, 50);
      } else if (canvas && !gridImages[index]) {
        // If there are no images for this canvas, clear it
        canvas.clear();
        canvas.renderAll();
      }
    });
  }, [gridImages, loadImages]);

  // Update layout when initialLayout changes
  useEffect(() => {
    if (initialLayout && initialLayout !== getCurrentLayout()) {
      setLayout([
        parseInt(initialLayout.split('x')[0], 10) || 1,
        parseInt(initialLayout.split('x')[1], 10) || 1
      ]);
    }
  }, [initialLayout, getCurrentLayout]);

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
          <div className="input-group">
            <input
              id="grid-rows"
              type="number"
              min="1"
              max="4"
              value={layoutInput[0]}
              onChange={e => handleLayoutChange(e, 'row')}
              onBlur={e => handleBlur(e, 'row')}
              aria-label="Grid rows"
              className={`layout-input ${validationError.row ? 'input-error' : ''}`}
            />
            {validationError.row && (
              <div className="validation-error">{validationError.row}</div>
            )}
          </div>
          <span className="layout-separator">×</span>
          <div className="input-group">
            <input
              id="grid-cols"
              type="number"
              min="1"
              max="4"
              value={layoutInput[1]}
              onChange={e => handleLayoutChange(e, 'col')}
              onBlur={e => handleBlur(e, 'col')}
              aria-label="Grid columns"
              className={`layout-input ${validationError.col ? 'input-error' : ''}`}
            />
            {validationError.col && (
              <div className="validation-error">{validationError.col}</div>
            )}
          </div>
        </div>

        {/* Navigation buttons with arrow icons */}
        {images && images.length > gridDimensions.total && (
          <div className="gallery-nav-buttons">
            <span className="gallery-page-indicator">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              className="gallery-nav-button"
              onClick={() => handleNavigation('prev')}
              disabled={isNavButtonDisabled('prev')}
              title="Previous page"
            >
              <LeftArrowIcon />
            </button>
            <button
              className="gallery-nav-button"
              onClick={() => handleNavigation('next')}
              disabled={isNavButtonDisabled('next')}
              title="Next page"
            >
              <RightArrowIcon />
            </button>
          </div>
        )}
      </div>

      <div
        className="gallery-grid"
        style={{
          gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
          gridAutoRows: 'auto',
          gridAutoFlow: 'row'
        }}
      >
        {canvasKeys.slice(0, gridDimensions.total).map((key, index) => {
          // Cell height should be set at render time based on calculated values
          // This makes each cell's height match the canvas height that was calculated
          const cellStyle: React.CSSProperties = {
            height: `${cellHeight}px`
          };

          return (
            <div
              key={key}
              className={`gallery-cell cell-${index}`}
              style={cellStyle}
            >
              <canvas id={key} width="100%" height="100%" />
            </div>
          );
        })}
      </div>

      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
