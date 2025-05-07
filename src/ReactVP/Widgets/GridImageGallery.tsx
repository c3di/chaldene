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

  // Add states for selection and comparison
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );
  const [gridImages, setGridImages] = useState<IGalleryImage[][]>([]);

  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const isInitializing = useRef<string | false>(false);
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
      const newLayout = [...layout];
      newLayout[index] = parsed;

      setCurrentPage(0);

      isInitializing.current = false;
      setLayout(newLayout as [number, number]);

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

  // A simpler approach for selecting images
  const selectImage = useCallback(
    (imageIndex: number) => {
      setSelectedImageIndex(imageIndex);

      // Calculate which page this image is on and switch to it if needed
      const itemsPerPage = gridDimensions.total;
      const targetPage = Math.floor(imageIndex / itemsPerPage);
      if (targetPage !== currentPage) {
        setCurrentPage(targetPage);
      }
    },
    [currentPage, gridDimensions.total]
  );

  // A simple direct DOM approach for cell clicks
  const handleCellClick = useCallback(
    (imageIndex: number) => {
      // Skip if no valid image at this index
      if (!images || imageIndex >= images.length) {
        return;
      }

      // Clear previous selections visually
      document.querySelectorAll('.gallery-cell').forEach(cell => {
        cell.classList.remove('selected');
      });

      // Mark this cell as selected
      const cellIndex = imageIndex % gridDimensions.total;
      const selectedCell = document.querySelector(`.cell-${cellIndex}`);
      if (selectedCell) {
        selectedCell.classList.add('selected');
      }

      // Update the selected image index
      selectImage(imageIndex);

      // Prepare the image data to send to the parent component
      const selectedImage = images[imageIndex];
      if ('params' in selectedImage && selectedImage.params) {
        // Send complete parameter data to parent
        setValue?.(forWhom, {
          filename: selectedImage.filename,
          params: selectedImage.params
        });
      } else {
        // Fall back to just the filename if no params
        setValue?.(forWhom, [selectedImage.filename]);
      }
    },
    [gridDimensions.total, selectImage, setValue, forWhom, images]
  );

  // Calculate page indices to know which images to display
  const pageStartIndex = currentPage * gridDimensions.total;

  // Update grid images array to use direct indexing
  useEffect(() => {
    const cellCount = gridDimensions.total;
    const newGridImages: IGalleryImage[][] = [];

    for (let i = 0; i < cellCount; i++) {
      const imageIndex = pageStartIndex + i;
      if (images && imageIndex < images.length) {
        newGridImages.push([images[imageIndex]]);
      } else {
        newGridImages.push([]);
      }
    }

    setGridImages(newGridImages);
  }, [gridDimensions.total, pageStartIndex, images]);

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
          canvas.upperCanvasEl.style.pointerEvents = 'auto'; // Ensure interaction events work
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
            selectable: true, // Make sure it's selectable
            hasControls: false, // No resize handles
            hasBorders: true, // Show borders when selected
            evented: true, // Ensure it can receive events
            perPixelTargetFind: false, // For better performance
            hoverCursor: 'pointer' // Show pointer on hover
          });

          // Apply a subtle hover effect
          fabricObject.on('mouseover', () => {
            fabricObject.set(
              'shadow',
              new fabric.Shadow({
                color: 'rgba(0,0,0,0.3)',
                blur: 10,
                offsetX: 0,
                offsetY: 0
              })
            );
            canvas.requestRenderAll();
          });

          fabricObject.on('mouseout', () => {
            fabricObject.set('shadow', null);
            canvas.requestRenderAll();
          });

          canvas.add(fabricObject);
        }

        // Immediately render to display changes
        canvas.renderAll();
      } catch (err) {
        console.error('[GridImageGallery] Error in arrangeThumbnails:', err);
      }
    },
    [layout]
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

  // Restore the loadImages function with enhanced event binding
  const loadImages = useCallback(
    async (
      canvas: fabric.Canvas,
      images: IGalleryImage[],
      canvasIndex: number
    ) => {
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
            canvas.wrapperEl.style.cursor = 'pointer';
          }

          // Configure canvas for interaction
          canvas.selection = false;
          canvas.defaultCursor = 'pointer';
          canvas.hoverCursor = 'pointer';

          if (canvas.upperCanvasEl) {
            canvas.upperCanvasEl.style.pointerEvents = 'auto';
            canvas.upperCanvasEl.style.cursor = 'pointer';
          }

          // Ensure both canvas elements are clickable
          if (canvas.lowerCanvasEl) {
            canvas.lowerCanvasEl.style.cursor = 'pointer';
          }

          // Remove any existing event listeners first to prevent duplicates
          canvas.off('mouse:down');

          // Bind cell click handler directly
          canvas.on('mouse:down', e => {
            const cellIndex = canvasIndex % gridDimensions.total;
            const imageIndex = pageStartIndex + cellIndex;

            if (images && imageIndex < images.length) {
              handleCellClick(imageIndex);
            }
          });

          arrangeThumbnails(processed, canvas);

          // Force render to ensure changes take effect
          canvas.renderAll();
        }
      } catch (err) {
        console.error('[GridImageGallery] Error loading images:', err);
        setError('Failed to load images');
      } finally {
        if (!canvas.isDisposed) {
          setLoading(false);
        }
      }
    },
    [
      arrangeThumbnails,
      createImageObject,
      gridDimensions.total,
      handleCellClick,
      pageStartIndex
    ]
  );

  // Toggle compare mode
  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev);
  }, []);

  // Function to calculate cell size based on container width and column count
  const calculateCellSize = useCallback(
    (containerWidth: number, columns: number, rows: number) => {
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

      // Directly update existing canvas heights
      canvasRefs.current.forEach((canvas, i) => {
        if (canvas && !canvas.isDisposed) {
          canvas.setHeight(cellHeight);
          canvas.setDimensions({
            width: canvas.getWidth(),
            height: cellHeight
          });

          if (canvas.wrapperEl) {
            canvas.wrapperEl.style.height = `${cellHeight}px`;
          }

          canvas.renderAll();
        }
      });

      return cellHeight;
    },
    [canvasRefs]
  );

  // Setup canvas and event listeners - modify to pass index to loadImages
  useEffect(() => {
    // If already initializing, skip this cycle
    if (isInitializing.current) {
      return;
    }

    // Store layout hash to check for actual changes
    const currentLayoutHash = `${layout[0]}-${layout[1]}-${pageStartIndex}`;
    const prevLayoutHash = isInitializing.current ? isInitializing.current : '';

    // Skip if this exact layout and page was already initialized
    if (currentLayoutHash === prevLayoutHash) {
      return;
    }

    isInitializing.current = currentLayoutHash;

    // Initialize canvases based on layout
    const totalCanvases = gridDimensions.total;

    // Clean up existing canvases
    cleanupExistingCanvases();

    // Initialize new canvases with a small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      initializeCanvases(totalCanvases);
      isInitializing.current = currentLayoutHash;
    }, 150);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
    };
  }, [
    layout[0],
    layout[1],
    pageStartIndex,
    canvasKeys,
    gridDimensions.total,
    gridDimensions.cols,
    gridDimensions.rows,
    calculateCellSize,
    loadImages
  ]);

  // Helper function to clean up existing canvases
  const cleanupExistingCanvases = useCallback(() => {
    const currentCanvasRefs = canvasRefs.current;
    currentCanvasRefs.forEach((canvas, index) => {
      if (canvas) {
        try {
          canvas.off('mouse:down'); // Remove event listeners explicitly
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

    // Reset canvas references array
    const maxCanvases = 16; // 4x4
    canvasRefs.current = Array(maxCanvases).fill(null);
  }, []);

  // Helper function to initialize canvases
  const initializeCanvases = useCallback(
    (totalCanvases: number) => {
      // Get the container element to measure available width
      const gridContainer = document.querySelector('.gallery-grid');
      const containerWidth = gridContainer
        ? gridContainer.clientWidth
        : window.innerWidth * 0.9;

      // Calculate dynamic cell height based on container width, column count, and layout
      const cellHeight = calculateCellSize(
        containerWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );

      for (let i = 0; i < totalCanvases; i++) {
        const canvasElement = document.getElementById(canvasKeys[i]);
        if (!canvasElement || canvasRefs.current[i]) {
          continue;
        }

        // Clean up canvas element to ensure a fresh start
        while (canvasElement.firstChild) {
          canvasElement.removeChild(canvasElement.firstChild);
        }

        try {
          // Create the canvas with responsive dimensions
          const newCanvas = createCanvas(canvasElement, cellHeight);

          // Store the canvas reference
          canvasRefs.current[i] = newCanvas;

          // Calculate the cell index for this canvas
          const cellIndex = i % gridDimensions.total;
          const imageIndex = pageStartIndex + cellIndex;

          // Load images for this canvas with index
          if (gridImages[i] && gridImages[i].length > 0) {
            loadImages(newCanvas, gridImages[i], i);
          } else {
            // Even with no images, bind the click handler
            newCanvas.on('mouse:down', () => {
              if (images && imageIndex < images.length) {
                handleCellClick(imageIndex);
              }
            });
          }
        } catch (error) {
          console.error(
            `[GridImageGallery] Error initializing canvas ${i}:`,
            error
          );
          canvasRefs.current[i] = null;
        }
      }
    },
    [
      calculateCellSize,
      canvasKeys,
      gridDimensions.total,
      gridDimensions.cols,
      gridDimensions.rows,
      gridImages,
      pageStartIndex,
      loadImages,
      handleCellClick,
      images
    ]
  );

  // Helper function to create a canvas with proper configuration
  const createCanvas = useCallback(
    (canvasElement: HTMLElement, height: number): fabric.Canvas => {
      const newCanvas = new fabric.Canvas(canvasElement.id, {
        width: canvasElement.parentElement?.clientWidth || 500,
        height: height,
        selection: false,
        renderOnAddRemove: true,
        selectionColor: 'rgba(0, 120, 215, 0.2)',
        selectionBorderColor: '#0078D7',
        defaultCursor: 'pointer',
        hoverCursor: 'pointer',
        preserveObjectStacking: true,
        backgroundColor: '#f9f9f9',
        imageSmoothingEnabled: true,
        enableRetinaScaling: true,
        interactive: true
      });

      // Configure the upper canvas
      if (newCanvas.upperCanvasEl) {
        newCanvas.upperCanvasEl.style.background = 'transparent';
        newCanvas.upperCanvasEl.style.backgroundColor = 'transparent';
        newCanvas.upperCanvasEl.style.pointerEvents = 'auto';
        newCanvas.upperCanvasEl.style.cursor = 'pointer';
      }

      // Configure the wrapper element
      if (newCanvas.wrapperEl) {
        newCanvas.wrapperEl.style.width = '100%';
        newCanvas.wrapperEl.style.height = `${height}px`;
        newCanvas.wrapperEl.style.position = 'relative';
        newCanvas.wrapperEl.style.display = 'block';
        newCanvas.wrapperEl.style.boxSizing = 'border-box';
        newCanvas.wrapperEl.style.cursor = 'pointer';
      }

      return newCanvas;
    },
    []
  );

  // Update images when gridImages change
  useEffect(() => {
    canvasRefs.current.forEach((canvas, index) => {
      if (canvas && !canvas.isDisposed && gridImages[index]) {
        setTimeout(() => {
          loadImages(canvas, gridImages[index], index);
        }, 50);
      } else if (canvas && !gridImages[index]) {
        // If there are no images for this canvas, clear it
        canvas.clear();
        canvas.renderAll();
      }
    });
  }, [gridImages, loadImages]);

  // Add window resize listener to recalculate cell heights
  useEffect(() => {
    const handleResize = () => {
      // Get the container element to measure available width
      const gridContainer = document.querySelector('.gallery-grid');
      if (gridContainer) {
        const containerWidth = gridContainer.clientWidth;
        calculateCellSize(
          containerWidth,
          gridDimensions.cols,
          gridDimensions.rows
        );
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateCellSize, gridDimensions.cols, gridDimensions.rows]);

  // Update layout when initialLayout changes
  useEffect(() => {
    if (initialLayout && initialLayout !== getCurrentLayout()) {
      setLayout([
        parseInt(initialLayout.split('x')[0], 10) || 1,
        parseInt(initialLayout.split('x')[1], 10) || 1
      ]);
    }
  }, [initialLayout, getCurrentLayout]);

  // Recalculate cell height whenever the layout changes
  useEffect(() => {
    // Get the container element to measure available width
    const gridContainer = document.querySelector('.gallery-grid');
    if (gridContainer) {
      const containerWidth = gridContainer.clientWidth;
      // Force recalculation of cell size when layout changes
      calculateCellSize(
        containerWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );

      // Force reinitialization
      isInitializing.current = false;
    }
  }, [layout, gridDimensions.cols, gridDimensions.rows, calculateCellSize]);

  return (
    <div
      className={`grid-image-gallery-widget widget layout-${getCurrentLayout()}`}
    >
      <div className="gallery-controls">
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

        <div className="gallery-action-buttons">
          <button
            className={`gallery-action-button ${compareMode ? 'active' : ''}`}
            onClick={toggleCompareMode}
            title="Compare images"
          >
            Compare
          </button>
        </div>
      </div>

      <div
        className="gallery-grid"
        style={{
          gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`
        }}
      >
        {images &&
          Array.from({ length: gridDimensions.total }).map((_, cellIndex) => {
            const imageIndex = pageStartIndex + cellIndex;
            const hasImage = images && imageIndex < images.length;
            const isSelected = selectedImageIndex === imageIndex;

            return (
              <div
                key={`cell-${cellIndex}`}
                className={`gallery-cell cell-${cellIndex} ${isSelected ? 'selected' : ''} ${!hasImage ? 'empty' : ''}`}
                style={{ height: `${cellHeight}px` }}
                onClick={
                  hasImage ? () => handleCellClick(imageIndex) : undefined
                }
                title={hasImage ? `Image ${imageIndex + 1}` : 'No image'}
              >
                {hasImage && (
                  <div className="gallery-image-container">
                    <img
                      src={
                        images[imageIndex].base64 || images[imageIndex].imageUrl
                      }
                      alt={`Thumbnail ${imageIndex}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
