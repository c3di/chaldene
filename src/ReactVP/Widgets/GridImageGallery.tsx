import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback
} from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';
import { GalleryImage, IGalleryImage } from './ImageGallery';
import { LeftArrowIcon, RightArrowIcon } from '../Style';

interface IGridImageGalleryProps extends WidgetProps {
  images?: IGalleryImage[];
  value?: string[]; // Corresponds to selectedImageIndex or similar, based on parent's use
  initialLayout?: GridLayout;
}

type GridLayout = string;

export function GridImageGallery({
  forWhom,
  setValue,
  images,
  initialLayout
}: IGridImageGalleryProps): JSX.Element {
  // --- State ---
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
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  // --- Refs ---
  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const isInitializing = useRef<string | false>(false); // Used to prevent redundant initializations
  const navigationEffectFirstRun = useRef<boolean>(true);
  const prevCurrentPageForNavEffectRef = useRef<number>(currentPage);

  // --- Memoized Calculations ---
  const getCurrentLayout = useCallback(
    () => `${layout[0]}x${layout[1]}`,
    [layout]
  );

  const gridDimensions = useMemo(
    () => ({
      rows: layout[0],
      cols: layout[1],
      total: layout[0] * layout[1]
    }),
    [layout]
  );

  const totalPages = useMemo(() => {
    if (!images || gridDimensions.total <= 0) {
      return 1;
    }
    return Math.ceil(images.length / gridDimensions.total);
  }, [images, gridDimensions.total]);

  const pageStartIndex = useMemo(
    () => currentPage * gridDimensions.total,
    [currentPage, gridDimensions.total]
  );

  const canvasKeys = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    const keys: string[] = [];
    const maxCells = 16; // 4x4 max layout
    for (let i = 0; i < maxCells; i++) {
      keys.push(`gallery-grid-${id}-${i}`);
    }
    return keys;
  }, [forWhom]);

  // --- Callbacks ---
  const isNavButtonDisabled = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        return currentPage === 0;
      }
      return currentPage >= totalPages - 1;
    },
    [currentPage, totalPages]
  );

  const cleanupExistingCanvases = useCallback(() => {
    canvasRefs.current.forEach((canvas, index) => {
      if (canvas) {
        try {
          canvas.off('mouse:down');
          canvas.clear();
          canvas.dispose();
          canvasRefs.current[index] = null;
        } catch (err) {
          console.error(
            `[GridImageGallery] Error disposing canvas ${index}:`,
            err
          );
        }
      }
    });
    canvasRefs.current = Array(16).fill(null); // Reset refs array
  }, []);

  const calculateCellSize = useCallback(
    (containerWidth: number, columns: number, rows: number) => {
      const gap = 10;
      if (columns <= 0 || rows <= 0) {
        return 50;
      } // Prevent division by zero / invalid layout

      const cellWidth = (containerWidth - (columns - 1) * gap) / columns;
      let newCellHeight = cellWidth; // Default: square cells

      const galleryGrid = document.querySelector(
        '.gallery-grid'
      ) as HTMLElement;
      const gridClientHeight = galleryGrid ? galleryGrid.clientHeight : 0;

      // Adjust height based on layout aspect ratio or container height
      if (columns === 1 && gridClientHeight > 0) {
        const totalGapSpaceVertical = (rows - 1) * gap;
        if (gridClientHeight > totalGapSpaceVertical) {
          const availableHeightForCells =
            gridClientHeight - totalGapSpaceVertical;
          newCellHeight = availableHeightForCells / rows;
        }
      } else if (rows > columns && !(rows === 1 && columns === 1)) {
        const heightRatio = Math.max(0.4, 1 - (rows - columns) * 0.2);
        newCellHeight = Math.min(cellWidth * heightRatio, 300); // Adjust for tall layouts, max 300
      }

      newCellHeight = Math.max(50, newCellHeight);
      setCellHeight(newCellHeight);
      return newCellHeight;
    },
    []
  );

  const createCanvas = useCallback(
    (canvasElement: HTMLElement, height: number): fabric.Canvas => {
      const parentWidth = canvasElement.parentElement?.clientWidth || 300;
      const newCanvas = new fabric.Canvas(canvasElement.id, {
        width: parentWidth,
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
      if (newCanvas.upperCanvasEl) {
        newCanvas.upperCanvasEl.style.background = 'transparent';
        newCanvas.upperCanvasEl.style.backgroundColor = 'transparent';
        newCanvas.upperCanvasEl.style.pointerEvents = 'auto';
        newCanvas.upperCanvasEl.style.cursor = 'pointer';
      }
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

  const arrangeThumbnails = useCallback(
    (thumbnails: IGalleryImage[], canvas: fabric.Canvas) => {
      if (!canvas || canvas.isDisposed) {
        return;
      }
      try {
        canvas.clear();
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();

        if (
          thumbnails.length > 0 &&
          thumbnails[0].fabricObject &&
          canvasWidth > 0 &&
          canvasHeight > 0
        ) {
          const fabricObject = thumbnails[0].fabricObject;
          const originalWidth = fabricObject.width || 100;
          const originalHeight = fabricObject.height || 100;

          if (originalWidth > 0 && originalHeight > 0) {
            const scaleX = canvasWidth / originalWidth;
            const scaleY = canvasHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY);

            fabricObject.set({
              scaleX: scale,
              scaleY: scale,
              originX: 'center',
              originY: 'center',
              left: canvasWidth / 2,
              top: canvasHeight / 2,
              selectable: true,
              visible: true,
              opacity: 1,
              evented: true,
              active: true
            });
            canvas.add(fabricObject);

            // Short delay render for potential resize adjustments
            setTimeout(() => {
              if (!canvas.isDisposed) {
                canvas.renderAll();
              }
            }, 50);
            canvas.renderAll();
          }
        }
      } catch (err) {
        console.error('[DEBUG] Error in arrangeThumbnails:', err);
      }
    },
    []
  );

  const createImageObject = useCallback(
    async (img: IGalleryImage, index: number): Promise<IGalleryImage> => {
      if (!img.base64 && !img.imageUrl) {
        return { ...img };
      }
      try {
        const imageSource = img.base64 || img.imageUrl!;
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
                visible: true,
                crossOrigin: 'anonymous'
              });
              if (image.getElement() instanceof HTMLImageElement) {
                (image.getElement() as HTMLImageElement).style.imageRendering =
                  'high-quality';
              }
              resolve(image);
            } catch (error) {
              reject(error);
            }
          };
          imgElement.onerror = reject;
          imgElement.src = imageSource;
        });
        return { ...img, fabricObject: fabricImg as unknown as GalleryImage };
      } catch (error) {
        console.error('[DEBUG] Error in createImageObject:', error);
        return { ...img };
      }
    },
    []
  );

  const loadImages = useCallback(
    async (canvas: fabric.Canvas, imagesToLoad: IGalleryImage[]) => {
      if (!canvas || canvas.isDisposed) {
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const processed = await Promise.all(
          imagesToLoad.map(async (img, index) => {
            return createImageObject(img, index);
          })
        );
        if (!canvas.isDisposed) {
          if (canvas.wrapperEl) {
            canvas.wrapperEl.classList.toggle(
              'has-images',
              imagesToLoad.length > 0
            );
            canvas.wrapperEl.style.display = 'block';
            canvas.wrapperEl.style.visibility = 'visible';
          }
          arrangeThumbnails(
            processed.filter(p => p.fabricObject),
            canvas
          );
        }
      } catch (err) {
        setError('Failed to load images');
      } finally {
        if (!canvas.isDisposed) {
          setLoading(false);
        }
      }
    },
    [createImageObject, arrangeThumbnails] // dependencies are stable callbacks
  );

  const initializeCanvases = useCallback(
    (totalCanvases: number) => {
      const gridContainer = document.querySelector('.gallery-grid');
      const containerWidth = gridContainer
        ? gridContainer.clientWidth
        : window.innerWidth * 0.9;
      if (
        containerWidth <= 0 ||
        gridDimensions.cols <= 0 ||
        gridDimensions.rows <= 0
      ) {
        return;
      }

      const currentDynamicCellHeight = calculateCellSize(
        containerWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );
      const currentPageStartIndex = currentPage * gridDimensions.total;

      for (let i = 0; i < totalCanvases; i++) {
        const canvasElement = document.getElementById(canvasKeys[i]);
        if (!canvasElement || canvasRefs.current[i]) {
          continue;
        } // Skip if element missing or ref already exists

        while (canvasElement.firstChild) {
          canvasElement.removeChild(canvasElement.firstChild);
        } // Clear element

        try {
          const newCanvas = createCanvas(
            canvasElement,
            currentDynamicCellHeight
          );
          canvasRefs.current[i] = newCanvas;

          const imageIndex = currentPageStartIndex + i;
          const imageToLoad =
            images && imageIndex < images.length ? [images[imageIndex]] : [];

          if (imageToLoad.length > 0) {
            loadImages(newCanvas, imageToLoad);
          } else {
            // Optionally bind click for empty cell logic if needed via Fabric
            // newCanvas.on('mouse:down', () => handleCellClick(imageIndex)); // Already handled by div onClick
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
      gridDimensions.cols,
      gridDimensions.rows,
      gridDimensions.total,
      loadImages,
      images,
      currentPage,
      createCanvas // Removed handleCellClick as it's not directly used here
    ]
  );

  const selectImage = useCallback(
    (imageIndex: number) => {
      setSelectedImageIndex(imageIndex);
      const itemsPerPage = gridDimensions.total;
      if (itemsPerPage > 0) {
        const targetPage = Math.floor(imageIndex / itemsPerPage);
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage); // This will trigger navigation effect
        }
      }
    },
    [currentPage, gridDimensions.total]
  );

  const handleCellClick = useCallback(
    (imageIndex: number) => {
      if (!images || imageIndex >= images.length) {
        return;
      }
      // Selection state is handled by setting selectedImageIndex, which triggers re-render
      // CSS class '.selected' is applied conditionally in JSX based on this state
      selectImage(imageIndex);
      const selectedImageData = images[imageIndex];
      if (selectedImageData) {
        // Check if image data exists
        if ('params' in selectedImageData && selectedImageData.params) {
          setValue?.(forWhom, {
            filename: selectedImageData.filename,
            params: selectedImageData.params
          });
        } else {
          setValue?.(forWhom, [selectedImageData.filename]);
        }
      }
    },
    [selectImage, setValue, forWhom, images] // gridDimensions.total removed as logic moved
  );

  const handleLayoutChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    dimension: 'row' | 'col'
  ) => {
    const inputValue = e.target.value;
    const index = dimension === 'row' ? 0 : 1;
    const newLayoutInput = [...layoutInput] as [string, string];
    newLayoutInput[index] = inputValue;
    setLayoutInput(newLayoutInput);

    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 4) {
      const newLayout = [...layout] as [number, number];
      newLayout[index] = parsed;
      setCurrentPage(0); // Reset to page 1 on layout change
      isInitializing.current = false; // Allow re-initialization
      setLayout(newLayout); // Trigger effects depending on layout
      setValidationError(prev => ({ ...prev, [dimension]: undefined }));
    } else if (!isNaN(parsed)) {
      setValidationError(prev => ({
        ...prev,
        [dimension]: `${dimension === 'row' ? 'Rows' : 'Columns'} must be between 1 and 4`
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    dimension: 'row' | 'col'
  ) => {
    const value = parseInt(e.target.value, 10);
    const index = dimension === 'row' ? 0 : 1;
    if (isNaN(value) || value < 1 || value > 4) {
      const newLayoutInput = [...layoutInput] as [string, string];
      newLayoutInput[index] = layout[index].toString();
      setLayoutInput(newLayoutInput);
      setValidationError(prev => ({ ...prev, [dimension]: undefined }));
    }
  };

  const handleNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      let newPage = currentPage;
      if (direction === 'prev' && currentPage > 0) {
        newPage--;
      } else if (direction === 'next' && currentPage < totalPages - 1) {
        newPage++;
      } else {
        return;
      }
      setCurrentPage(newPage); // Triggers navigation effect
    },
    [currentPage, totalPages]
  );

  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev);
  }, []);

  // --- Effects ---

  // Apply initial layout once
  useEffect(() => {
    if (initialLayout) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      const initialRows = parseInt(rowsStr, 10) || 1;
      const initialCols = parseInt(colsStr, 10) || 1;
      setLayout([initialRows, initialCols]);
      setLayoutInput([initialRows.toString(), initialCols.toString()]);
      // No forceUpdate needed, layout change triggers main setup effect
    }
  }, []); // Empty deps = runs once on mount

  // Update layout if prop changes later
  useEffect(() => {
    if (initialLayout && initialLayout !== getCurrentLayout()) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      setLayout([parseInt(rowsStr, 10) || 1, parseInt(colsStr, 10) || 1]);
      // Reset to page 1 if layout prop changes? Optional.
      // setCurrentPage(0);
    }
  }, [initialLayout, getCurrentLayout]); // getCurrentLayout depends on layout state

  // Main Canvas Setup/Re-initialization Effect
  useEffect(() => {
    // Use a hash to prevent re-running for the exact same state if effect triggered rapidly
    const currentLayoutHash = `${layout[0]}-${layout[1]}-${currentPage}-${images?.length ?? 0}`;
    if (isInitializing.current === currentLayoutHash) {
      return;
    }
    isInitializing.current = currentLayoutHash;

    const totalCanvases = gridDimensions.total;
    if (totalCanvases <= 0) {
      return;
    }

    cleanupExistingCanvases();

    // Delay initialization slightly to allow DOM updates
    const initTimeout = setTimeout(() => {
      initializeCanvases(totalCanvases);
      // Mark initialization complete for this hash *after* init runs
      // isInitializing.current = currentLayoutHash; // Already set above
    }, 150);

    return () => clearTimeout(initTimeout);
  }, [
    layout,
    currentPage,
    images, // Core state driving the grid content
    gridDimensions.total, // Derived from layout
    canvasKeys, // Stable if forWhom is stable
    initializeCanvases, // Stable if its own deps are stable
    cleanupExistingCanvases // Stable
  ]);

  // Effect to handle actual page navigation (after currentPage state updates)
  useEffect(() => {
    if (navigationEffectFirstRun.current) {
      navigationEffectFirstRun.current = false;
      prevCurrentPageForNavEffectRef.current = currentPage;
      return;
    }
    // This effect now primarily checks if currentPage changed.
    // If it changed, the main setup effect above should have already handled re-initialization.
    // This effect might become redundant or only needed for page-change-specific logic *not* involving canvas re-init.
    if (prevCurrentPageForNavEffectRef.current !== currentPage) {
      prevCurrentPageForNavEffectRef.current = currentPage;
      isInitializing.current = false;
    }
  }, [currentPage, gridDimensions.total]);

  // Effect for window resize
  useEffect(() => {
    const handleResize = () => {
      const gridContainer = document.querySelector('.gallery-grid');
      if (gridContainer && gridDimensions.cols > 0) {
        calculateCellSize(
          gridContainer.clientWidth,
          gridDimensions.cols,
          gridDimensions.rows
        );
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Calculate initial size
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateCellSize, gridDimensions.cols, gridDimensions.rows]); // calculateCellSize is stable

  // Effect to resize canvases and rescale images when cellHeight changes
  useEffect(() => {
    // Skip if no canvases or invalid height
    if (canvasRefs.current.every(ref => ref === null) || cellHeight <= 0) {
      return;
    }

    const updateCanvasSizesAndScaling = () => {
      canvasRefs.current.forEach(canvas => {
        if (canvas && !canvas.isDisposed) {
          const parentWidth =
            canvas.wrapperEl?.parentElement?.clientWidth || 300;
          // Use setDimensions for atomic update if available, otherwise set individually
          canvas.setDimensions({ width: parentWidth, height: cellHeight });
          if (canvas.wrapperEl) {
            canvas.wrapperEl.style.height = `${cellHeight}px`;
          }

          // Rescale existing image object
          const fabricObject = canvas.getObjects()[0] as fabric.Image;
          if (fabricObject instanceof fabric.Image) {
            const originalWidth = fabricObject.width || 100;
            const originalHeight = fabricObject.height || 100;
            if (
              originalWidth > 0 &&
              originalHeight > 0 &&
              parentWidth > 0 &&
              cellHeight > 0
            ) {
              const scaleX = parentWidth / originalWidth;
              const scaleY = cellHeight / originalHeight;
              const scale = Math.min(scaleX, scaleY);
              fabricObject.set({
                scaleX: scale,
                scaleY: scale,
                left: parentWidth / 2,
                top: cellHeight / 2
              });
            }
          }
          canvas.renderAll();
        }
      });
    };

    updateCanvasSizesAndScaling();
  }, [cellHeight]);

  // Effect to handle layout changes (after layout state updates)
  useEffect(() => {
    // When layout changes, recalculate cell size.
    // The change in cellHeight will trigger the effect above to resize/rescale canvases.
    const gridContainer = document.querySelector('.gallery-grid');
    if (gridContainer && gridDimensions.cols > 0) {
      calculateCellSize(
        gridContainer.clientWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );
    }
  }, [layout, calculateCellSize, gridDimensions.cols, gridDimensions.rows]);

  // --- Render ---
  return (
    <div
      className={`grid-image-gallery-widget widget layout-${getCurrentLayout()}`}
    >
      <div className="gallery-controls">
        {/* Navigation */}
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
        {/* Layout Inputs */}
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
        {/* Action Buttons */}
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

      {/* Image Grid */}
      <div
        className="gallery-grid"
        style={{
          gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
          gridAutoRows: 'auto',
          gridAutoFlow: 'row',
          gap: '10px'
        }}
      >
        {gridDimensions.total > 0 &&
          canvasKeys.slice(0, gridDimensions.total).map((key, index) => {
            const imageIndexInAllImages = pageStartIndex + index;
            const hasImage = images && imageIndexInAllImages < images.length;
            const imageInThisCell = hasImage
              ? images![imageIndexInAllImages]
              : null; // Derive directly
            const isSelected = selectedImageIndex === imageIndexInAllImages;
            const cellKey = `${key}-${imageInThisCell ? imageInThisCell.filename : 'empty'}-${currentPage}-${imageIndexInAllImages}`; // Unique key

            return (
              <div
                key={cellKey}
                className={`gallery-cell cell-${index} ${isSelected ? 'selected' : ''} ${!hasImage ? 'empty' : ''}`}
                style={{ height: `${cellHeight}px`, minHeight: '50px' }}
                onClick={
                  hasImage
                    ? () => handleCellClick(imageIndexInAllImages)
                    : undefined
                }
                title={
                  hasImage ? `Image ${imageIndexInAllImages + 1}` : 'No image'
                }
              >
                <canvas id={key} />
              </div>
            );
          })}
      </div>

      {/* Loading/Error Indicators */}
      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
