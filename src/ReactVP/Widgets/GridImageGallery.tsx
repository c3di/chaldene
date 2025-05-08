import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  const [gridImages, setGridImages] = useState<IGalleryImage[][]>([]);
  const [forceUpdate, setForceUpdate] = useState<number>(0);

  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const isInitializing = useRef<string | false>(false);
  const debounceTimeout = useRef<number | null>(null);
  const navigationEffectFirstRun = useRef<boolean>(true);
  const prevCurrentPageForNavEffectRef = useRef<number>(currentPage); // MODIFICATION: Ref to track previous currentPage for navigation effect

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
      setForceUpdate(prev => prev + 1);
    }
  }, []); // Removed initialLayout from deps to ensure it only runs once

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

    const newLayoutInput = [...layoutInput] as [string, string];
    newLayoutInput[index] = inputValue;
    setLayoutInput(newLayoutInput);

    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 4) {
      const newLayout = [...layout] as [number, number];
      newLayout[index] = parsed;

      setCurrentPage(0);
      isInitializing.current = false;
      setLayout(newLayout);

      setTimeout(() => {
        cleanupExistingCanvases();
        setForceUpdate(prev => prev + 1);
      }, 10);

      setValidationError(prev => ({
        ...prev,
        [dimension]: undefined
      }));
    } else if (!isNaN(parsed)) {
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

    if (isNaN(value) || value < 1 || value > 4) {
      const newLayoutInput = [...layoutInput] as [string, string];
      newLayoutInput[index] = layout[index].toString();
      setLayoutInput(newLayoutInput);
      setValidationError(prev => ({
        ...prev,
        [dimension]: undefined
      }));
    }
  };

  useEffect(() => clearDebounce, [clearDebounce]);

  const canvasKeys = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    const keys: string[] = [];
    const maxCells = 16; // 4x4
    for (let i = 0; i < maxCells; i++) {
      keys.push(`gallery-grid-${id}-${i}`);
    }
    return keys;
  }, [forWhom]);

  const selectImage = useCallback(
    (imageIndex: number) => {
      setSelectedImageIndex(imageIndex);
      const itemsPerPage = gridDimensions.total;
      if (itemsPerPage > 0) {
        // Ensure itemsPerPage is not zero
        const targetPage = Math.floor(imageIndex / itemsPerPage);
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    },
    [currentPage, gridDimensions.total] // setSelectedImageIndex is stable
  );

  const handleCellClick = useCallback(
    (imageIndex: number) => {
      if (!images || imageIndex >= images.length) {
        return;
      }
      document.querySelectorAll('.gallery-cell').forEach(cell => {
        cell.classList.remove('selected');
      });
      const cellIndexInPage = imageIndex % gridDimensions.total;
      const selectedCell = document.querySelector(`.cell-${cellIndexInPage}`);
      if (selectedCell) {
        selectedCell.classList.add('selected');
      }
      selectImage(imageIndex);
      const selectedImageData = images[imageIndex];
      if ('params' in selectedImageData && selectedImageData.params) {
        setValue?.(forWhom, {
          filename: selectedImageData.filename,
          params: selectedImageData.params
        });
      } else {
        setValue?.(forWhom, [selectedImageData.filename]);
      }
    },
    [gridDimensions.total, selectImage, setValue, forWhom, images]
  );

  const pageStartIndex = useMemo(
    () => currentPage * gridDimensions.total,
    [currentPage, gridDimensions.total]
  );

  useEffect(() => {
    if (gridDimensions.total === 0) {
      return;
    } // Avoid division by zero or incorrect calculations
    const cellCount = gridDimensions.total;
    const newGridImages: IGalleryImage[][] = [];
    const startIdx = currentPage * cellCount;

    for (let i = 0; i < cellCount; i++) {
      const imageIndex = startIdx + i;
      if (images && imageIndex < images.length) {
        newGridImages.push([images[imageIndex]]);
      } else {
        newGridImages.push([]);
      }
    }
    setGridImages(newGridImages);
    if (isInitializing.current === false) {
      setForceUpdate(prev => prev + 1);
    }
  }, [gridDimensions.total, currentPage, images]);

  const arrangeThumbnails = useCallback(
    (thumbnails: IGalleryImage[], canvas: fabric.Canvas) => {
      if (!canvas || canvas.isDisposed) {
        console.error(
          '[DEBUG] Canvas is null or disposed in arrangeThumbnails'
        );
        return;
      }
      try {
        canvas.clear();
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        if (canvas.upperCanvasEl) {
          canvas.upperCanvasEl.style.background = 'transparent';
          canvas.upperCanvasEl.style.backgroundColor = 'transparent';
        }
        if (thumbnails.length > 0 && thumbnails[0].fabricObject) {
          const fabricObject = thumbnails[0].fabricObject;
          const originalWidth = fabricObject.width || 100;
          const originalHeight = fabricObject.height || 100;
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
              const currentWidth = canvas.getWidth();
              const currentHeight = canvas.getHeight();
              if (
                currentWidth !== canvasWidth ||
                currentHeight !== canvasHeight
              ) {
                const newScaleX = currentWidth / originalWidth;
                const newScaleY = currentHeight / originalHeight;
                const newScale = Math.min(newScaleX, newScaleY);
                fabricObject.set({
                  scaleX: newScale,
                  scaleY: newScale,
                  left: currentWidth / 2,
                  top: currentHeight / 2
                });
              }
              canvas.renderAll();
            }
          }, 50);
          canvas.renderAll();
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
              console.error('[DEBUG] Error creating fabric image:', error);
              reject(error);
            }
          };
          imgElement.onerror = err => {
            console.error('[DEBUG] Failed to load image:', img.filename, err);
            reject(new Error(`Failed to load image ${img.filename}`));
          };
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
      // Renamed images to imagesToLoad
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
          imagesToLoad.map(async (img, index) => {
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
            canvas.wrapperEl.classList.toggle(
              'has-images',
              imagesToLoad.length > 0
            );
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
    [createImageObject, arrangeThumbnails] // Added dependencies
  );

  useEffect(() => {
    if (gridImages.length === 0) {
      return;
    }
    const updateTimeout = setTimeout(() => {
      canvasRefs.current.forEach((canvas, index) => {
        if (
          canvas &&
          !canvas.isDisposed &&
          gridImages[index] &&
          gridImages[index].length > 0
        ) {
          loadImages(canvas, gridImages[index]);
        }
      });
    }, 50);
    return () => clearTimeout(updateTimeout);
  }, [gridImages, loadImages]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev);
  }, []);

  const handleNavigation = useCallback(
    (direction: 'prev' | 'next') => {
      let newPage = currentPage;
      if (direction === 'prev' && currentPage > 0) {
        newPage = currentPage - 1;
      } else if (direction === 'next' && currentPage < totalPages - 1) {
        newPage = currentPage + 1;
      } else {
        return;
      }
      setCurrentPage(newPage);
    },
    [currentPage, totalPages]
  );

  const calculateCellSize = useCallback(
    (containerWidth: number, columns: number, rows: number) => {
      const gap = 10;
      const cellWidth = (containerWidth - (columns - 1) * gap) / columns;
      let newCellHeight = cellWidth;
      const galleryGrid = document.querySelector(
        '.gallery-grid'
      ) as HTMLElement;
      const gridClientHeight = galleryGrid ? galleryGrid.clientHeight : 0;

      if (columns === 1 && rows > 0 && gridClientHeight > 0) {
        // Ensure rows > 0
        const totalGapSpaceVertical = (rows - 1) * gap;
        if (gridClientHeight > totalGapSpaceVertical) {
          const availableHeightForCells =
            gridClientHeight - totalGapSpaceVertical;
          newCellHeight = availableHeightForCells / rows;
        }
      } else if (rows > columns && !(rows === 1 && columns === 1)) {
        const heightRatio = Math.max(0.4, 1 - (rows - columns) * 0.2);
        newCellHeight = Math.min(cellWidth * heightRatio, 300); // Max height constraint
      } else {
        newCellHeight = Math.min(cellWidth, 400); // Default aspect or max height
      }
      newCellHeight = Math.max(50, newCellHeight); // Min height constraint
      setCellHeight(newCellHeight);
      return newCellHeight;
    },
    [] // setCellHeight is stable
  );

  useEffect(() => {
    if (
      isInitializing.current &&
      isInitializing.current ===
        `${layout[0]}-${layout[1]}-${pageStartIndex}-${forceUpdate}`
    ) {
      return;
    }
    const currentLayoutHash = `${layout[0]}-${layout[1]}-${pageStartIndex}-${forceUpdate}`;
    if (isInitializing.current === currentLayoutHash && !forceUpdate) {
      // Be more specific
      return;
    }
    isInitializing.current = currentLayoutHash;
    const totalCanvases = gridDimensions.total;
    cleanupExistingCanvases();
    const initTimeout = setTimeout(() => {
      if (gridDimensions.total > 0) {
        // Ensure canvases are only initialized if grid exists
        initializeCanvases(totalCanvases);
      }
      // isInitializing.current should reflect the hash of the initialized state
      // isInitializing.current = currentLayoutHash; // Already set above
    }, 150);
    return () => {
      clearTimeout(initTimeout);
    };
  }, [
    layout,
    pageStartIndex,
    canvasKeys,
    gridDimensions.total,
    gridDimensions.cols,
    gridDimensions.rows,
    calculateCellSize,
    currentPage,
    forceUpdate // Removed layout[0], layout[1] as layout obj is used
    // Keep initializeCanvases and cleanupExistingCanvases if they were intended here,
    // but they are usually not dependencies of the main setup effect itself.
    // Adding them might cause loops if not careful.
  ]);

  const cleanupExistingCanvases = useCallback(() => {
    canvasRefs.current.forEach((canvas, index) => {
      if (canvas) {
        try {
          canvas.off('mouse:down');
          canvas.clear(); // Explicitly clear before dispose
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
    canvasRefs.current = Array(16).fill(null); // Max 4x4
  }, []);

  const createCanvas = useCallback(
    (canvasElement: HTMLElement, height: number): fabric.Canvas => {
      const newCanvas = new fabric.Canvas(canvasElement.id, {
        width: canvasElement.parentElement?.clientWidth || 300, // Default width
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

  const initializeCanvases = useCallback(
    (totalCanvases: number) => {
      const gridContainer = document.querySelector('.gallery-grid');
      const containerWidth = gridContainer
        ? gridContainer.clientWidth
        : window.innerWidth * 0.9;

      const currentDynamicCellHeight = calculateCellSize(
        containerWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );

      const currentPageStartIndex = currentPage * gridDimensions.total;
      const updatedGridImages: IGalleryImage[][] = [];
      for (let i = 0; i < totalCanvases; i++) {
        const imageIndex = currentPageStartIndex + i;
        if (images && imageIndex < images.length) {
          updatedGridImages.push([images[imageIndex]]);
        } else {
          updatedGridImages.push([]);
        }
      }
      for (let i = 0; i < totalCanvases; i++) {
        const canvasElement = document.getElementById(canvasKeys[i]);
        if (!canvasElement || canvasRefs.current[i]) {
          continue;
        }
        while (canvasElement.firstChild) {
          canvasElement.removeChild(canvasElement.firstChild);
        }
        try {
          const newCanvas = createCanvas(
            canvasElement,
            currentDynamicCellHeight
          ); // Use calculated height
          canvasRefs.current[i] = newCanvas;
          if (updatedGridImages[i] && updatedGridImages[i].length > 0) {
            loadImages(newCanvas, updatedGridImages[i]);
          } else {
            newCanvas.on('mouse:down', () => {
              // Simplified, original had 'e'
              const imageIndex =
                currentPageStartIndex + (i % gridDimensions.total);
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
      gridDimensions.cols,
      gridDimensions.rows,
      gridDimensions.total,
      loadImages,
      handleCellClick,
      images,
      currentPage,
      createCanvas
    ]
  );

  useEffect(() => {
    const handleResize = () => {
      const gridContainer = document.querySelector('.gallery-grid');
      if (gridContainer) {
        const containerWidth = gridContainer.clientWidth;
        if (gridDimensions.cols > 0) {
          // Ensure cols > 0
          calculateCellSize(
            containerWidth,
            gridDimensions.cols,
            gridDimensions.rows
          );
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Call on mount too
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateCellSize, gridDimensions.cols, gridDimensions.rows]);

  useEffect(() => {
    if (initialLayout && initialLayout !== getCurrentLayout()) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      setLayout([parseInt(rowsStr, 10) || 1, parseInt(colsStr, 10) || 1]);
    }
  }, [initialLayout, getCurrentLayout]);

  useEffect(() => {
    const gridContainer = document.querySelector('.gallery-grid');
    if (gridContainer && gridDimensions.cols > 0) {
      // Ensure cols > 0
      const containerWidth = gridContainer.clientWidth;
      calculateCellSize(
        containerWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );
      isInitializing.current = false; // Allow re-initialization on layout change

      // This double updateCanvasSizes can be reviewed, but keeping for now.
      const updateCanvasSizes = () => {
        canvasRefs.current.forEach(canvas => {
          if (canvas && !canvas.isDisposed) {
            const parentWidth =
              canvas.wrapperEl?.parentElement?.clientWidth || 300;
            canvas.setDimensions({ width: parentWidth, height: cellHeight });
            if (canvas.wrapperEl) {
              canvas.wrapperEl.style.height = `${cellHeight}px`;
            }
            // Re-apply scaling to existing objects
            canvas.getObjects().forEach(obj => {
              if (obj instanceof fabric.Image) {
                const originalWidth = obj.width || 100;
                const originalHeight = obj.height || 100;
                const scaleX = parentWidth / originalWidth;
                const scaleY = cellHeight / originalHeight;
                const scale = Math.min(scaleX, scaleY);
                obj.set({
                  scaleX: scale,
                  scaleY: scale,
                  left: parentWidth / 2,
                  top: cellHeight / 2
                });
              }
            });
            canvas.renderAll();
          }
        });
      };
      updateCanvasSizes();
      setTimeout(updateCanvasSizes, 100);
    }
  }, [
    layout,
    gridDimensions.cols,
    gridDimensions.rows,
    calculateCellSize,
    cellHeight
  ]); // `layout` implies gridDimensions change

  useEffect(() => {
    if (!images || images.length === 0) {
      return;
    }

    const isInitialLoad = !canvasRefs.current.some(ref => ref !== null);
    if (isInitialLoad) {
      setCurrentPage(0);
      // Reset navigationEffectFirstRun for new image sets
      navigationEffectFirstRun.current = true;
      prevCurrentPageForNavEffectRef.current = 0;
    }
    isInitializing.current = false;
    setForceUpdate(prev => prev + 1);
  }, [images]);

  // MODIFIED: Page navigation effect
  useEffect(() => {
    if (navigationEffectFirstRun.current) {
      navigationEffectFirstRun.current = false;
      prevCurrentPageForNavEffectRef.current = currentPage;
      return;
    }

    // Only perform full re-initialization if currentPage has actually changed
    if (prevCurrentPageForNavEffectRef.current !== currentPage) {
      isInitializing.current = false; // Allow initialization
      const updateTimeout = setTimeout(() => {
        cleanupExistingCanvases();
        setTimeout(() => {
          if (gridDimensions.total > 0) {
            // Ensure canvases are only initialized if grid exists
            initializeCanvases(gridDimensions.total);
          }
        }, 50);
      }, 10);
      prevCurrentPageForNavEffectRef.current = currentPage; // Update ref to the new current page
      return () => clearTimeout(updateTimeout);
    }
  }, [
    currentPage,
    cleanupExistingCanvases,
    initializeCanvases,
    gridDimensions.total
  ]);

  useEffect(() => {
    if (canvasRefs.current.every(ref => ref === null) || cellHeight <= 0) {
      return;
    }
    const updateCanvasSizes = () => {
      canvasRefs.current.forEach(canvas => {
        if (canvas && !canvas.isDisposed) {
          const parentWidth =
            canvas.wrapperEl?.parentElement?.clientWidth || 300;
          canvas.setDimensions({ width: parentWidth, height: cellHeight });

          if (canvas.wrapperEl) {
            canvas.wrapperEl.style.height = `${cellHeight}px`;
          }
          canvas.getObjects().forEach(obj => {
            if (obj instanceof fabric.Image) {
              const originalWidth = obj.width || 100;
              const originalHeight = obj.height || 100;
              // Ensure canvas dimensions are positive before calculating scale
              const currentCanvasWidth = canvas.getWidth();
              const currentCanvasHeight = canvas.getHeight();
              if (
                originalWidth > 0 &&
                originalHeight > 0 &&
                currentCanvasWidth > 0 &&
                currentCanvasHeight > 0
              ) {
                const scaleX = currentCanvasWidth / originalWidth;
                const scaleY = currentCanvasHeight / originalHeight;
                const scale = Math.min(scaleX, scaleY);
                obj.set({
                  scaleX: scale,
                  scaleY: scale,
                  left: currentCanvasWidth / 2,
                  top: currentCanvasHeight / 2
                });
              }
            }
          });
          canvas.renderAll();
        }
      });
    };
    updateCanvasSizes();
    const secondUpdateTimeout = setTimeout(updateCanvasSizes, 100);
    return () => clearTimeout(secondUpdateTimeout);
  }, [cellHeight]);

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
          gridAutoRows: 'auto', // Changed from fixed height to auto based on cell content
          gridAutoFlow: 'row',
          gap: '10px' // Added gap for consistency
        }}
      >
        {/* Render only if gridDimensions.total is positive */}
        {gridDimensions.total > 0 &&
          canvasKeys.slice(0, gridDimensions.total).map((key, index) => {
            const cellStyle: React.CSSProperties = {
              height: `${cellHeight}px`, // Cell height is controlled by cellHeight state
              minHeight: '50px' // Ensure a minimum height
            };
            const imageIndexInAllImages = pageStartIndex + index;
            const hasImage = images && imageIndexInAllImages < images.length;
            const isSelected = selectedImageIndex === imageIndexInAllImages;
            const imageInThisCell =
              gridImages[index] && gridImages[index].length > 0
                ? gridImages[index][0]
                : null;
            // Key includes currentPage to help React differentiate cells when page changes
            const cellKey = `${key}-${imageInThisCell ? imageInThisCell.filename : 'empty'}-${currentPage}-${imageIndexInAllImages}`;

            return (
              <div
                key={cellKey}
                className={`gallery-cell cell-${index} ${isSelected ? 'selected' : ''} ${!hasImage ? 'empty' : ''}`}
                style={cellStyle}
                onClick={
                  hasImage
                    ? () => handleCellClick(imageIndexInAllImages)
                    : undefined
                }
                title={
                  hasImage ? `Image ${imageIndexInAllImages + 1}` : 'No image'
                }
              >
                {/* Canvas element for Fabric.js */}
                <canvas id={key} />
              </div>
            );
          })}
      </div>

      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
