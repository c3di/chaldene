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
  value?: string[];
  initialLayout?: GridLayout;
  onDeleteImage?: (imageIndex: number) => void;
}

type GridLayout = string;

export function GridImageGallery({
  forWhom,
  setValue,
  images,
  initialLayout,
  onDeleteImage
}: IGridImageGalleryProps): JSX.Element {
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

  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const isInitializing = useRef<boolean>(false);
  const hasInitializedOnce = useRef<boolean>(false);

  const navigationEffectFirstRun = useRef<boolean>(true);
  const prevCurrentPageForNavEffectRef = useRef<number>(currentPage);

  const lastReportedSelectionToParentRef = useRef<string | null>(null);

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
    const maxCells = 16;
    for (let i = 0; i < maxCells; i++) {
      keys.push(`gallery-grid-${id}-${i}`);
    }
    return keys;
  }, [forWhom]);

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
    canvasRefs.current = Array(16).fill(null);
  }, []);

  const calculateCellSize = useCallback(
    (containerWidth: number, columns: number, rows: number) => {
      const gap = 10;
      if (columns <= 0 || rows <= 0) {
        return 50;
      }
      const cellWidth = (containerWidth - (columns - 1) * gap) / columns;
      let newCellHeight = cellWidth;
      const galleryGrid = document.querySelector(
        '.gallery-grid'
      ) as HTMLElement;
      const gridClientHeight = galleryGrid ? galleryGrid.clientHeight : 0;

      if (columns === 1 && gridClientHeight > 0) {
        const totalGapSpaceVertical = (rows - 1) * gap;
        if (gridClientHeight > totalGapSpaceVertical) {
          const availableHeightForCells =
            gridClientHeight - totalGapSpaceVertical;
          newCellHeight = availableHeightForCells / rows;
        }
      } else if (rows > columns && !(rows === 1 && columns === 1)) {
        const heightRatio = Math.max(0.4, 1 - (rows - columns) * 0.2);
        newCellHeight = Math.min(cellWidth * heightRatio, 300);
      } else {
        newCellHeight = Math.min(cellWidth, 400);
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
      if (!img.base64) {
        return { ...img };
      }
      try {
        const imageSource = img.base64;
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
          imagesToLoad.map((img, idx) =>
            createImageObject(img, pageStartIndex + idx)
          )
        );
        if (!canvas.isDisposed) {
          if (canvas.wrapperEl) {
            canvas.wrapperEl.classList.toggle(
              'has-images',
              imagesToLoad.length > 0
            );
            Object.assign(canvas.wrapperEl.style, {
              display: 'block',
              visibility: 'visible'
            });
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
    [createImageObject, arrangeThumbnails, pageStartIndex]
  );

  const initializeCanvases = useCallback(
    (totalCanvases: number) => {
      // The Main Setup Effect (caller) is responsible for deciding if this function should run.

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

      // Ensure all old canvases are cleaned before creating new ones.
      cleanupExistingCanvases();

      for (let i = 0; i < totalCanvases; i++) {
        const canvasElement = document.getElementById(canvasKeys[i]);
        if (!canvasElement) {
          console.warn(
            `[DEBUG] Canvas element ${canvasKeys[i]} not found for index ${i}`
          );
          continue;
        }
        while (canvasElement.firstChild) {
          canvasElement.removeChild(canvasElement.firstChild);
        }

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
            newCanvas.clear();
            newCanvas.renderAll();
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
      createCanvas,
      cleanupExistingCanvases
    ]
  );

  const selectImage = useCallback(
    (imageIndex: number) => {
      setSelectedImageIndex(imageIndex);
      const itemsPerPage = gridDimensions.total;
      if (itemsPerPage > 0) {
        const targetPage = Math.floor(imageIndex / itemsPerPage);
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
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
      selectImage(imageIndex);
      const selectedImageData = images[imageIndex];
      if (selectedImageData) {
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
    [selectImage, setValue, forWhom, images]
  );

  const handleDeleteClick = useCallback(
    (event: React.MouseEvent, imageIndex: number) => {
      event.stopPropagation(); // Important: Prevent cell click (selection)
      onDeleteImage?.(imageIndex);
    },
    [onDeleteImage]
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
      setCurrentPage(0);
      setLayout(newLayout);
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
      setCurrentPage(newPage);
    },
    [currentPage, totalPages]
  );

  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev);
  }, []);

  // Initial setup for layout from prop
  useEffect(() => {
    if (initialLayout && !hasInitializedOnce.current) {
      // Only on first mount if initialLayout is present
      const [rowsStr, colsStr] = initialLayout.split('x');
      const initialRows = parseInt(rowsStr, 10) || 1;
      const initialCols = parseInt(colsStr, 10) || 1;
      setLayout([initialRows, initialCols]);
      setLayoutInput([initialRows.toString(), initialCols.toString()]);
      // Main setup effect will be triggered by layout change
    }
  }, [initialLayout]); // Runs if initialLayout prop changes (or on mount)

  // Update layout if prop changes dynamically AFTER initial setup
  useEffect(() => {
    if (
      initialLayout &&
      getCurrentLayout() !== initialLayout &&
      hasInitializedOnce.current
    ) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      const newRows = parseInt(rowsStr, 10) || layout[0];
      const newCols = parseInt(colsStr, 10) || layout[1];
      if (newRows !== layout[0] || newCols !== layout[1]) {
        setLayout([newRows, newCols]);
        setCurrentPage(0); // Optionally reset page
      }
    }
  }, [initialLayout, getCurrentLayout, layout]);

  // Main Canvas Setup/Re-initialization Effect
  useEffect(() => {
    if (isInitializing.current) {
      return;
    }

    const totalCanvases = gridDimensions.total;
    if (totalCanvases <= 0) {
      if (canvasRefs.current.some(c => c !== null)) {
        // Only cleanup if there's something to clean
        cleanupExistingCanvases();
      }
      return;
    }

    isInitializing.current = true;

    const initTimeout = setTimeout(() => {
      try {
        initializeCanvases(totalCanvases); // This function now calls cleanupExistingCanvases internally first
        if (!hasInitializedOnce.current) {
          hasInitializedOnce.current = true;
        }
      } catch (e) {
        console.error('[DEBUG] Error during initializeCanvases execution:', e);
      } finally {
        // IMPORTANT: Reset the flag after initializeCanvases has effectively run
        isInitializing.current = false;
      }
    }, 75);

    return () => {
      clearTimeout(initTimeout);
      if (isInitializing.current) {
        // Only reset if it was set to true by this instance of the effect
        isInitializing.current = false;
      }
    };
  }, [
    layout,
    currentPage,
    images, // Reference change to images triggers this
    initializeCanvases, // Callback reference
    cleanupExistingCanvases, // Callback reference
    gridDimensions.total // Derived from layout
    // canvasKeys is stable if forWhom is stable; initializeCanvases depends on it.
  ]);

  // Page Navigation Logic
  useEffect(() => {
    if (navigationEffectFirstRun.current) {
      navigationEffectFirstRun.current = false;
      prevCurrentPageForNavEffectRef.current = currentPage;
      return;
    }
    if (prevCurrentPageForNavEffectRef.current !== currentPage) {
      prevCurrentPageForNavEffectRef.current = currentPage;
    }
  }, [currentPage]);

  // Window Resize Handler
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
    // Calculate initial size after a brief delay for layout to settle
    const initialResizeTimeout = setTimeout(handleResize, 100);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialResizeTimeout);
    };
  }, [calculateCellSize, gridDimensions.cols, gridDimensions.rows]);

  // Effect to resize canvases and rescale images when cellHeight actually changes
  useEffect(() => {
    if (
      canvasRefs.current.every(ref => ref === null) ||
      cellHeight <= 0 ||
      !hasInitializedOnce.current
    ) {
      return; // Only run if canvases exist, height is valid, and initial setup is done
    }
    const updateCanvasSizesAndScaling = () => {
      canvasRefs.current.forEach(canvas => {
        if (canvas && !canvas.isDisposed) {
          const parentWidth =
            canvas.wrapperEl?.parentElement?.clientWidth || 300;
          canvas.setDimensions({ width: parentWidth, height: cellHeight });
          if (canvas.wrapperEl) {
            canvas.wrapperEl.style.height = `${cellHeight}px`;
          }
          const fabricObject = canvas.getObjects()[0] as fabric.Image;
          if (fabricObject instanceof fabric.Image) {
            const { width: originalWidth = 100, height: originalHeight = 100 } =
              fabricObject;
            if (
              originalWidth > 0 &&
              originalHeight > 0 &&
              parentWidth > 0 &&
              cellHeight > 0
            ) {
              const scale = Math.min(
                parentWidth / originalWidth,
                cellHeight / originalHeight
              );
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
    // Debounce this potentially expensive operation slightly
    const debounceTimeout = setTimeout(updateCanvasSizesAndScaling, 50);
    return () => clearTimeout(debounceTimeout);
  }, [cellHeight]);

  // Effect for when layout state changes (to recalculate cell size)
  useEffect(() => {
    if (!hasInitializedOnce.current && !initialLayout) {
      return;
    } // Don't run initially if no initialLayout and not yet initialized
    const gridContainer = document.querySelector('.gallery-grid');
    if (gridContainer && gridDimensions.cols > 0) {
      calculateCellSize(
        gridContainer.clientWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );
    }
  }, [
    layout,
    gridDimensions.cols,
    gridDimensions.rows,
    calculateCellSize,
    initialLayout
  ]);

  // Effect to update parent with selected image params OR clear them
  useEffect(() => {
    let currentReportKey: string | null = null;
    let valueToReportToParent: any = []; // Default to "deselected"

    if (images === undefined && !hasInitializedOnce.current) {
      // Still loading initial images, or images prop is not yet ready.
      // Don't report anything yet to avoid premature deselection signal.
      return;
    }

    if (
      selectedImageIndex !== null &&
      images &&
      selectedImageIndex < images.length
    ) {
      const currentSelectedImage = images[selectedImageIndex];
      if (currentSelectedImage) {
        // Create a unique key for the selected image's state
        currentReportKey = `image-${currentSelectedImage.filename}-${JSON.stringify(currentSelectedImage.params || {})}`;
        if ('params' in currentSelectedImage && currentSelectedImage.params) {
          valueToReportToParent = {
            filename: currentSelectedImage.filename,
            params: currentSelectedImage.params
          };
        } else {
          valueToReportToParent = [currentSelectedImage.filename];
        }
      } else {
        // Should be rare if index is in bounds but image is null
        currentReportKey = 'deselected-stale-index';
      }
    } else {
      // No image selected (selectedImageIndex is null or out of bounds)
      currentReportKey = 'deselected-no-selection';
    }

    // Only call setValue if the effective selection state to report has changed
    if (lastReportedSelectionToParentRef.current !== currentReportKey) {
      setValue?.(forWhom, valueToReportToParent);
      lastReportedSelectionToParentRef.current = currentReportKey;
    }
  }, [selectedImageIndex, images, setValue, forWhom]);

  // Effect to handle selectedImageIndex becoming invalid after images array changes (e.g. deletion)
  useEffect(() => {
    if (
      selectedImageIndex !== null &&
      images &&
      selectedImageIndex >= images.length
    ) {
      setSelectedImageIndex(null); // This will trigger the effect above to inform parent
    }
  }, [images, selectedImageIndex]);

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
              : null;
            const isSelected = selectedImageIndex === imageIndexInAllImages;
            const cellKey = `${key}-${imageInThisCell ? imageInThisCell.filename : 'empty'}-${currentPage}-${imageIndexInAllImages}`;

            return (
              <div
                key={cellKey}
                className={`gallery-cell cell-${index} ${isSelected ? 'selected' : ''} ${!hasImage ? 'empty' : ''}`}
                style={{
                  height: `${cellHeight}px`,
                  minHeight: '50px',
                  position: 'relative'
                }} // Added position: relative
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
                {isSelected && hasImage && onDeleteImage && (
                  <button
                    className="delete-image-button"
                    onClick={e => handleDeleteClick(e, imageIndexInAllImages)}
                    title="Remove this image"
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: 'rgba(255, 0, 0, 0.7)',
                      color: 'white',
                      border: '1px solid rgba(200,0,0,0.9)',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      fontSize: '14px',
                      lineHeight: '22px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                  >
                    &times; {/* Using HTML entity for X */}
                  </button>
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
