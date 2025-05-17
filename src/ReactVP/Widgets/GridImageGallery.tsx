import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback
} from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';
import { IGalleryImage } from './ImageGallery';
import { LeftArrowIcon, RightArrowIcon } from '../Style';

import type EditorContext from '../EditorContext';

const getMousePosition = (e: Event): { x: number; y: number } => {
  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  } else if (e instanceof TouchEvent && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: 0, y: 0 };
};

interface IGridImageGalleryProps extends WidgetProps {
  images?: IGalleryImage[];
  value?: string[];
  initialLayout?: GridLayout;
  onDeleteImage?: (imageIndex: number) => void;
  editorContext?: EditorContext;
}

type GridLayout = string;

interface ITransform {
  x: number;
  y: number;
  zoom: number;
}

export function GridImageGallery({
  forWhom,
  setValue,
  images = [],
  initialLayout,
  onDeleteImage,
  editorContext
}: IGridImageGalleryProps): JSX.Element {
  const [layout, setLayout] = useState<[number, number]>([1, 1]);
  const [layoutInput, setLayoutInput] = useState<[string, string]>(['1', '1']);
  const [validationError, setValidationError] = useState<{
    row?: string;
    col?: string;
  }>({});
  const [cellHeight, setCellHeight] = useState<number>(300);

  const [activeTab, setActiveTab] = useState<'gallery' | 'compare'>('gallery');

  const [currentPage, setCurrentPage] = useState<number>(0);
  const [gallerySyncedTransform, setGallerySyncedTransform] =
    useState<ITransform | null>(null);

  const [compareImages, setCompareImages] = useState<IGalleryImage[]>([]);
  const [compareCurrentPage, setCompareCurrentPage] = useState<number>(0);
  const [compareSyncedTransform, setCompareSyncedTransform] =
    useState<ITransform | null>(null);

  const [unifiedSelectedImage, setUnifiedSelectedImage] = useState<{
    tab: 'gallery' | 'compare';
    indexInFullArray: number;
  } | null>(null);

  const [isPanning, setIsPanning] = useState(false);
  const lastPanPositionRef = useRef({ x: 0, y: 0 });
  const activePanningCanvasRef = useRef<fabric.Canvas | null>(null);
  const panStartPositionRef = useRef({ x: 0, y: 0 }); // For distinguishing click from pan
  const didActuallyPanRef = useRef(false); // Tracks if a pan truly occurred after mousedown

  const canvasRefs = useRef<(fabric.Canvas | null)[]>([]);
  const canvasElementRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const isInitializing = useRef<boolean>(false);
  const hasInitializedOnce = useRef<boolean>(false);
  const navigationEffectFirstRun = useRef<boolean>(true);
  const prevCurrentPageForNavEffectRef = useRef<number>(currentPage);
  const lastReportedSelectionToParentRef = useRef<string | null>(null);
  const prevActiveTabRef = useRef<'gallery' | 'compare'>(activeTab);

  const imagesForCurrentView = useMemo(
    () => (activeTab === 'gallery' ? images : compareImages),
    [activeTab, images, compareImages]
  );
  const currentPageForCurrentView =
    activeTab === 'gallery' ? currentPage : compareCurrentPage;
  const setCurrentPageForCurrentView =
    activeTab === 'gallery' ? setCurrentPage : setCompareCurrentPage;

  const setSyncedTransformForCurrentView =
    activeTab === 'gallery'
      ? setGallerySyncedTransform
      : setCompareSyncedTransform;

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

  const totalPagesForCurrentView = useMemo(() => {
    if (!imagesForCurrentView || gridDimensions.total <= 0) {
      return 1;
    }
    return Math.ceil(imagesForCurrentView.length / gridDimensions.total);
  }, [imagesForCurrentView, gridDimensions.total]);

  const pageStartIndexForCurrentView = useMemo(
    () => currentPageForCurrentView * gridDimensions.total,
    [currentPageForCurrentView, gridDimensions.total]
  );

  const canvasKeys = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    const keys: string[] = [];
    const maxCells = 25; // Max 5x5 grid
    for (let i = 0; i < maxCells; i++) {
      keys.push(`gallery-grid-${id}-${i}`);
    }
    return keys;
  }, [forWhom]);

  const isNavButtonDisabled = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        return currentPageForCurrentView === 0;
      }
      return currentPageForCurrentView >= totalPagesForCurrentView - 1;
    },
    [currentPageForCurrentView, totalPagesForCurrentView]
  );

  const cleanupExistingCanvases = useCallback(() => {
    canvasRefs.current.forEach((canvas, index) => {
      if (canvas) {
        try {
          canvas.off();
          canvas.clear();
          canvas.dispose();
          canvasRefs.current[index] = null;
          if (canvasElementRefs.current[index]) {
            canvasElementRefs.current[index] = null;
          }
        } catch (err) {
          console.error(
            `[GridImageGallery] Error disposing canvas ${index}:`,
            err
          );
        }
      }
    });
    const size = gridDimensions.total > 0 ? gridDimensions.total : 16;
    canvasRefs.current = Array(size).fill(null);
    canvasElementRefs.current = Array(size).fill(null);
  }, [gridDimensions.total]);

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
          newCellHeight = (gridClientHeight - totalGapSpaceVertical) / rows;
        }
      } else if (rows > columns && !(rows === 1 && columns === 1)) {
        newCellHeight = Math.min(
          cellWidth * Math.max(0.4, 1 - (rows - columns) * 0.2),
          300
        );
      } else {
        newCellHeight = Math.min(cellWidth, 400);
      }
      const finalHeight = Math.max(50, newCellHeight);
      setCellHeight(finalHeight);
      return finalHeight;
    },
    []
  );

  const createCanvas = useCallback(
    (
      fabricCanvasDOMElement: HTMLCanvasElement,
      height: number
    ): fabric.Canvas => {
      const parentWidth =
        fabricCanvasDOMElement.parentElement?.clientWidth || 300;
      const newCanvas = new fabric.Canvas(fabricCanvasDOMElement, {
        width: parentWidth,
        height: height,
        selection: false,
        renderOnAddRemove: true,
        backgroundColor: '#f9f9f9',
        imageSmoothingEnabled: true,
        enableRetinaScaling: true,
        interactive: true,
        defaultCursor: 'grab',
        hoverCursor: 'grab',
        preserveObjectStacking: true
      });
      if (newCanvas.wrapperEl) {
        newCanvas.wrapperEl.style.width = '100%';
        newCanvas.wrapperEl.style.height = `${height}px`;
      }
      return newCanvas;
    },
    []
  );

  const handleWindowMouseMove = useCallback(
    (event: MouseEvent) => {
      if (
        !activePanningCanvasRef.current ||
        activePanningCanvasRef.current.isDisposed
      ) {
        return;
      }

      const canvas = activePanningCanvasRef.current;
      const currentPos = getMousePosition(event as any);

      if (!didActuallyPanRef.current) {
        const deltaX = Math.abs(currentPos.x - panStartPositionRef.current.x);
        const deltaY = Math.abs(currentPos.y - panStartPositionRef.current.y);
        const panThreshold = 5; // Pixels to move before it's considered a pan

        if (deltaX > panThreshold || deltaY > panThreshold) {
          didActuallyPanRef.current = true;
          setIsPanning(true); // Set isPanning to true only when actual pan starts
        }
      }

      if (didActuallyPanRef.current) {
        // Pan logic (was isPanning, now using didActuallyPanRef for immediacy)
        const deltaXPan = currentPos.x - lastPanPositionRef.current.x;
        const deltaYPan = currentPos.y - lastPanPositionRef.current.y;

        if (canvas.viewportTransform) {
          canvas.viewportTransform[4] += deltaXPan;
          canvas.viewportTransform[5] += deltaYPan;
        }
        canvas.requestRenderAll();
        lastPanPositionRef.current = currentPos;

        const currentTransformSetter =
          activeTab === 'gallery'
            ? setGallerySyncedTransform
            : setCompareSyncedTransform;

        currentTransformSetter({
          zoom: canvas.getZoom(),
          x: canvas.viewportTransform ? canvas.viewportTransform[4] : 0,
          y: canvas.viewportTransform ? canvas.viewportTransform[5] : 0
        });
      }
    },
    [
      activeTab,
      setGallerySyncedTransform,
      setCompareSyncedTransform,
      setIsPanning
    ]
  );

  const handleWindowMouseUp = useCallback(() => {
    if (didActuallyPanRef.current) {
      setIsPanning(false); // Reset isPanning state if a pan truly occurred
    }
    // Always reset these regardless of whether a pan occurred, to clean up mousedown state
    didActuallyPanRef.current = false;
    activePanningCanvasRef.current = null;

    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
    window.removeEventListener('mouseleave', handleWindowMouseUp);
  }, [handleWindowMouseMove, setIsPanning]);

  const initializeCanvases = useCallback(
    (totalCanvasesToInit: number) => {
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
      cleanupExistingCanvases();

      // Get the correct current transform state directly
      const currentGlobalTransformState =
        activeTab === 'gallery'
          ? gallerySyncedTransform
          : compareSyncedTransform;

      for (let i = 0; i < totalCanvasesToInit; i++) {
        const canvasDOMElement = document.getElementById(
          canvasKeys[i]
        ) as HTMLCanvasElement | null;
        if (!canvasDOMElement) {
          continue;
        }
        canvasElementRefs.current[i] = canvasDOMElement;
        try {
          const newCanvas = createCanvas(
            canvasDOMElement,
            currentDynamicCellHeight
          );
          canvasRefs.current[i] = newCanvas;
          const imageIndexOnPage = pageStartIndexForCurrentView + i;
          const imageToLoad = imagesForCurrentView[imageIndexOnPage];

          if (imageToLoad && imageToLoad.base64) {
            const imgElement = new Image();
            imgElement.crossOrigin = 'anonymous';
            imgElement.src = imageToLoad.base64;
            imgElement.onload = () => {
              const img = new fabric.FabricImage(imgElement);
              if (newCanvas.isDisposed || !img) {
                return;
              }
              newCanvas.backgroundImage = img;
              const canvasWidth = newCanvas.getWidth();
              const canvasHeight = newCanvas.getHeight();
              const imgWidth = img.width || 1;
              const imgHeight = img.height || 1;
              const initialZoom = Math.min(
                canvasWidth / imgWidth,
                canvasHeight / imgHeight
              );
              const initialX = (canvasWidth - imgWidth * initialZoom) / 2;
              const initialY = (canvasHeight - imgHeight * initialZoom) / 2;

              // Apply synced transform if it exists, otherwise use initial fit
              if (currentGlobalTransformState) {
                newCanvas.setZoom(currentGlobalTransformState.zoom);
                if (newCanvas.viewportTransform) {
                  newCanvas.viewportTransform[4] =
                    currentGlobalTransformState.x;
                  newCanvas.viewportTransform[5] =
                    currentGlobalTransformState.y;
                }
              } else {
                newCanvas.setZoom(initialZoom);
                if (newCanvas.viewportTransform) {
                  newCanvas.viewportTransform[4] = initialX;
                  newCanvas.viewportTransform[5] = initialY;
                }
              }
              newCanvas.requestRenderAll();

              newCanvas.on('mouse:down', opt => {
                if (opt.e instanceof MouseEvent && opt.e.button !== 0) {
                  return;
                }
                // Don't set isPanning(true) here immediately.
                // Instead, record start position and set up for potential pan.
                const pos = getMousePosition(opt.e);
                panStartPositionRef.current = pos;
                lastPanPositionRef.current = pos; // Initialize for delta calculations
                didActuallyPanRef.current = false; // Reset for this new interaction
                activePanningCanvasRef.current = newCanvas;

                opt.e.preventDefault();
                opt.e.stopPropagation();

                window.addEventListener('mousemove', handleWindowMouseMove);
                window.addEventListener('mouseup', handleWindowMouseUp);
                window.addEventListener('mouseleave', handleWindowMouseUp);
              });

              // Remove old Fabric-based pan handlers, keep wheel for zoom
              // The new global handlers (handleWindowMouseMove, handleWindowMouseUp) manage panning.
              newCanvas.off('mouse:move');
              newCanvas.off('mouse:up');
              newCanvas.off('mouse:out');

              newCanvas.on('mouse:wheel', opt => {
                opt.e.preventDefault();
                opt.e.stopPropagation();
                const delta = opt.e.deltaY;
                let zoom = newCanvas.getZoom();
                zoom *= 0.999 ** delta;
                zoom = Math.max(0.05, Math.min(zoom, 10)); // Min zoom 0.05, Max zoom 10
                const pointer = newCanvas.getPointer(opt.e);
                newCanvas.zoomToPoint(
                  new fabric.Point(pointer.x, pointer.y),
                  zoom
                );
                setSyncedTransformForCurrentView({
                  zoom: newCanvas.getZoom(),
                  x: newCanvas.viewportTransform
                    ? newCanvas.viewportTransform[4]
                    : 0,
                  y: newCanvas.viewportTransform
                    ? newCanvas.viewportTransform[5]
                    : 0
                });
              });
            };
          } else {
            newCanvas.clear();
            newCanvas.requestRenderAll();
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
      gridDimensions.cols,
      gridDimensions.rows,
      calculateCellSize,
      cleanupExistingCanvases,
      createCanvas,
      canvasKeys,
      imagesForCurrentView,
      pageStartIndexForCurrentView,
      gallerySyncedTransform,
      compareSyncedTransform,
      setSyncedTransformForCurrentView,
      activeTab
    ]
  );

  const handleSelectImageForCurrentView = useCallback(
    (imageIndexInFullList: number) => {
      setUnifiedSelectedImage({
        tab: activeTab,
        indexInFullArray: imageIndexInFullList
      });
    },
    [activeTab]
  );

  const handleCellClickForCurrentView = useCallback(
    (imageIndexOnPage: number) => {
      const actualImageIndex = pageStartIndexForCurrentView + imageIndexOnPage;
      if (
        !imagesForCurrentView ||
        actualImageIndex >= imagesForCurrentView.length
      ) {
        return;
      }
      const targetPage = Math.floor(actualImageIndex / gridDimensions.total);
      if (targetPage !== currentPageForCurrentView) {
        setCurrentPageForCurrentView(targetPage);
      }
      handleSelectImageForCurrentView(actualImageIndex);
    },
    [
      imagesForCurrentView,
      pageStartIndexForCurrentView,
      gridDimensions.total,
      currentPageForCurrentView,
      setCurrentPageForCurrentView,
      handleSelectImageForCurrentView
    ]
  );

  const handleDeleteFromGallery = useCallback(
    (imageIndex: number) => {
      onDeleteImage?.(imageIndex);
      if (
        unifiedSelectedImage?.tab === 'gallery' &&
        unifiedSelectedImage?.indexInFullArray > imageIndex
      ) {
        setUnifiedSelectedImage(prev =>
          prev ? { ...prev, indexInFullArray: prev.indexInFullArray - 1 } : null
        );
      }
    },
    [onDeleteImage, unifiedSelectedImage]
  );

  const handleDeleteFromCompareList = useCallback(
    (indexInCompareList: number) => {
      setCompareImages(prev =>
        prev.filter((_, idx) => idx !== indexInCompareList)
      );
      if (
        unifiedSelectedImage?.tab === 'compare' &&
        unifiedSelectedImage?.indexInFullArray > indexInCompareList
      ) {
        setUnifiedSelectedImage(prev =>
          prev ? { ...prev, indexInFullArray: prev.indexInFullArray - 1 } : null
        );
      }
    },
    [unifiedSelectedImage]
  );

  const handleAddToCompare = useCallback((imageToAdd: IGalleryImage) => {
    setCompareImages(prevCompareImages => {
      if (
        !prevCompareImages.find(
          img =>
            img.filename === imageToAdd.filename &&
            img.base64 === imageToAdd.base64 // Ensure we check base64 too for uniqueness
        )
      ) {
        const newCompareImages = [...prevCompareImages, imageToAdd];
        return newCompareImages;
      }
      return prevCompareImages;
    });
  }, []);

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
    if (!isNaN(parsed) && parsed > 0 && parsed <= 5) {
      const newLayout = [...layout] as [number, number];
      newLayout[index] = parsed;
      setCurrentPage(0);
      setCompareCurrentPage(0);
      setLayout(newLayout);
      setValidationError(prev => ({ ...prev, [dimension]: undefined }));
      setGallerySyncedTransform(null);
      setCompareSyncedTransform(null);
    } else if (!isNaN(parsed)) {
      // Only set validation error if it's a number but out of range
      setValidationError(prev => ({
        ...prev,
        [dimension]: `${
          dimension === 'row' ? 'Rows' : 'Columns'
        } must be between 1 and 5`
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement>,
    dimension: 'row' | 'col'
  ) => {
    const value = parseInt(e.target.value, 10);
    const index = dimension === 'row' ? 0 : 1;
    // If input is invalid, revert to the current valid layout number
    if (isNaN(value) || value < 1 || value > 5) {
      const newLayoutInput = [...layoutInput] as [string, string];
      newLayoutInput[index] = layout[index].toString();
      setLayoutInput(newLayoutInput);
      setValidationError(prev => ({ ...prev, [dimension]: undefined })); // Clear validation error
    }
  };

  const handleNavigationForCurrentView = useCallback(
    (direction: 'prev' | 'next') => {
      let newPage = currentPageForCurrentView;
      if (direction === 'prev' && currentPageForCurrentView > 0) {
        newPage--;
      } else if (
        direction === 'next' &&
        currentPageForCurrentView < totalPagesForCurrentView - 1
      ) {
        newPage++;
      } else {
        return; // No change if at boundaries
      }
      setCurrentPageForCurrentView(newPage);
    },
    [
      currentPageForCurrentView,
      totalPagesForCurrentView,
      setCurrentPageForCurrentView
    ]
  );

  // Effect to handle initial layout from props
  useEffect(() => {
    if (initialLayout && !hasInitializedOnce.current) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      setLayout([parseInt(rowsStr, 10) || 1, parseInt(colsStr, 10) || 1]);
      setLayoutInput([rowsStr || '1', colsStr || '1']);
    }
  }, [initialLayout]);

  // Effect to update layout if initialLayout prop changes after first initialization
  useEffect(() => {
    if (
      initialLayout &&
      getCurrentLayout() !== initialLayout &&
      hasInitializedOnce.current // Ensures this runs only after first init
    ) {
      const [rowsStr, colsStr] = initialLayout.split('x');
      const newRows = parseInt(rowsStr, 10) || layout[0]; // Fallback to current if parsing fails
      const newCols = parseInt(colsStr, 10) || layout[1];
      if (newRows !== layout[0] || newCols !== layout[1]) {
        setLayout([newRows, newCols]);
        setCurrentPage(0); // Reset page
        setCompareCurrentPage(0);
        // MODIFICATION: Reset image transformation when layout changes via prop
        setGallerySyncedTransform(null);
        setCompareSyncedTransform(null);
      }
    }
  }, [initialLayout, getCurrentLayout, layout, hasInitializedOnce]);

  // Main effect for initializing and re-initializing canvases
  useEffect(() => {
    if (isInitializing.current) {
      return;
    }

    const totalCanvasesInGrid = gridDimensions.total;
    if (totalCanvasesInGrid <= 0) {
      if (canvasRefs.current.some(c => c !== null)) {
        cleanupExistingCanvases();
      }
      return; // Don't initialize if grid is 0x0 or invalid
    }

    isInitializing.current = true;
    const initTimeout = setTimeout(() => {
      try {
        initializeCanvases(totalCanvasesInGrid);
        if (!hasInitializedOnce.current) {
          hasInitializedOnce.current = true;
        }
      } catch (e) {
        console.error('[DEBUG] Error during initializeCanvases execution:', e);
      } finally {
        isInitializing.current = false;
      }
    }, 75); // Debounce initialization slightly

    return () => {
      clearTimeout(initTimeout);
      if (isInitializing.current) {
        // Ensure flag is reset if component unmounts during timeout
        isInitializing.current = false;
      }
    };
  }, [
    gridDimensions.total, // Re-run if total grid cells change
    imagesForCurrentView, // Re-run if images change
    pageStartIndexForCurrentView, // Re-run if current page changes
    initializeCanvases, // Dependency
    cleanupExistingCanvases // Dependency
  ]);

  // Reset navigation effect flag when activeTab changes
  useEffect(() => {
    navigationEffectFirstRun.current = true;
  }, [activeTab]);

  // Effect to track current page changes for navigation state (if needed elsewhere)
  useEffect(() => {
    if (navigationEffectFirstRun.current) {
      navigationEffectFirstRun.current = false;
      prevCurrentPageForNavEffectRef.current = currentPageForCurrentView;
      return;
    }
    if (prevCurrentPageForNavEffectRef.current !== currentPageForCurrentView) {
      // Logic if previous page is different from current (e.g., for analytics)
      prevCurrentPageForNavEffectRef.current = currentPageForCurrentView;
    }
  }, [currentPageForCurrentView, activeTab]); // Also depend on activeTab

  // Effect for handling window resize
  useEffect(() => {
    const handleResize = () => {
      const gridContainer = document.querySelector('.gallery-grid');
      if (gridContainer && gridDimensions.cols > 0) {
        // Recalculate cell size based on new container width
        calculateCellSize(
          gridContainer.clientWidth,
          gridDimensions.cols,
          gridDimensions.rows
        );
      }
    };
    window.addEventListener('resize', handleResize);
    const initialResizeTimeout = setTimeout(handleResize, 100); // Also run once on mount

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialResizeTimeout);
    };
  }, [calculateCellSize, gridDimensions.cols, gridDimensions.rows]); // Dependencies

  // Effect for updating canvas sizes and image scaling when cellHeight or activeTab changes
  useEffect(() => {
    if (
      canvasRefs.current.every(ref => ref === null) || // No canvases initialized
      cellHeight <= 0 || // Invalid cell height
      !hasInitializedOnce.current // Not yet initialized
    ) {
      return;
    }

    const updateCanvasSizesAndScaling = () => {
      // Get the correct current transform state directly
      const currentGlobalTransformState =
        activeTab === 'gallery'
          ? gallerySyncedTransform
          : compareSyncedTransform;

      canvasRefs.current.forEach(canvas => {
        if (canvas && !canvas.isDisposed) {
          const parentWidth =
            canvas.wrapperEl?.parentElement?.clientWidth || 300;
          canvas.setDimensions({ width: parentWidth, height: cellHeight });
          if (canvas.wrapperEl) {
            canvas.wrapperEl.style.height = `${cellHeight}px`; // Ensure wrapper height matches
          }

          if (
            canvas.backgroundImage &&
            typeof canvas.backgroundImage !== 'string' // Ensure it's a FabricImage
          ) {
            const fabricImg = canvas.backgroundImage as fabric.Image;
            const imgWidth = fabricImg.width || 1;
            const imgHeight = fabricImg.height || 1;

            if (currentGlobalTransformState) {
              canvas.setZoom(currentGlobalTransformState.zoom);
              if (canvas.viewportTransform) {
                canvas.viewportTransform[4] = currentGlobalTransformState.x;
                canvas.viewportTransform[5] = currentGlobalTransformState.y;
              }
            } else {
              // Fallback to fit if no synced transform
              const scale = Math.min(
                parentWidth / imgWidth,
                cellHeight / imgHeight
              );
              canvas.setZoom(scale);
              if (canvas.viewportTransform) {
                canvas.viewportTransform[4] =
                  (parentWidth - imgWidth * scale) / 2;
                canvas.viewportTransform[5] =
                  (cellHeight - imgHeight * scale) / 2;
              }
            }
          }
          canvas.renderAll();
        }
      });
    };

    // Debounce the update slightly
    const debounceTimeout = setTimeout(updateCanvasSizesAndScaling, 50);
    return () => clearTimeout(debounceTimeout);
  }, [cellHeight, activeTab, gallerySyncedTransform, compareSyncedTransform]);

  // Effect to recalculate cell size when layout or related dimensions change
  useEffect(() => {
    if (!hasInitializedOnce.current && !initialLayout) {
      // Don't run if not initialized and no initial layout to force it
      return;
    }
    const gridContainer = document.querySelector('.gallery-grid');
    if (gridContainer && gridDimensions.cols > 0) {
      calculateCellSize(
        gridContainer.clientWidth,
        gridDimensions.cols,
        gridDimensions.rows
      );
    }
  }, [
    layout, // Recalculate if layout array changes
    gridDimensions.cols,
    gridDimensions.rows,
    calculateCellSize,
    initialLayout // Also consider initialLayout for the first run
  ]);

  // Automatically select the image in 1x1 layout
  useEffect(() => {
    const is1x1 = gridDimensions.rows === 1 && gridDimensions.cols === 1;
    const hasImages = imagesForCurrentView.length > 0;

    if (is1x1 && hasImages) {
      const imageIndexToSelect = pageStartIndexForCurrentView; // The first image on the current page

      const isValidIndex = imageIndexToSelect < imagesForCurrentView.length;
      const isAlreadySelected =
        unifiedSelectedImage?.tab === activeTab &&
        unifiedSelectedImage?.indexInFullArray === imageIndexToSelect;

      if (isValidIndex && !isAlreadySelected) {
        setUnifiedSelectedImage({
          tab: activeTab,
          indexInFullArray: imageIndexToSelect
        });
      }
    }
  }, [
    gridDimensions.rows,
    gridDimensions.cols,
    imagesForCurrentView,
    pageStartIndexForCurrentView,
    unifiedSelectedImage,
    activeTab
  ]);

  // Effect to reset last reported selection when active tab changes
  useEffect(() => {
    if (prevActiveTabRef.current !== activeTab) {
      lastReportedSelectionToParentRef.current = null;
      setIsPanning(false);
      setUnifiedSelectedImage(null);
    }

    prevActiveTabRef.current = activeTab;
  }, [activeTab, setIsPanning]);

  // Effect for reporting selected image value to parent
  useEffect(() => {
    let imageToReport: IGalleryImage | null = null;
    let reportKeySource: string = 'deselected'; // Default to deselected

    if (unifiedSelectedImage !== null) {
      reportKeySource = unifiedSelectedImage.tab;
      if (
        unifiedSelectedImage.tab === 'gallery' &&
        images &&
        unifiedSelectedImage.indexInFullArray < images.length
      ) {
        imageToReport = images[unifiedSelectedImage.indexInFullArray];
      } else if (
        unifiedSelectedImage.tab === 'compare' &&
        compareImages &&
        unifiedSelectedImage.indexInFullArray < compareImages.length
      ) {
        imageToReport = compareImages[unifiedSelectedImage.indexInFullArray];
        reportKeySource = `compare-${unifiedSelectedImage.indexInFullArray}`; // Make compare key more specific if needed
      }
    }

    let currentReportKey: string | null = null;
    let valueToReportToParent: any = [];

    if (imageToReport) {
      currentReportKey = `${reportKeySource}-image-${
        imageToReport.filename
      }-${JSON.stringify(imageToReport.params || {})}`;
      if ('params' in imageToReport && imageToReport.params) {
        valueToReportToParent = {
          filename: imageToReport.filename,
          params: imageToReport.params
        };
      } else {
        valueToReportToParent = [imageToReport.filename]; // Fallback to filename array
      }
    } else {
      currentReportKey = `${reportKeySource}-deselected`; // Key for deselection
    }

    // Only report if the effective key has changed
    if (lastReportedSelectionToParentRef.current !== currentReportKey) {
      setValue?.(forWhom, valueToReportToParent);
      lastReportedSelectionToParentRef.current = currentReportKey;
    }
  }, [
    activeTab,
    images,
    compareImages,
    unifiedSelectedImage,
    setValue,
    forWhom
  ]);

  // Effect to deselect if selected image index becomes out of bounds
  useEffect(() => {
    if (unifiedSelectedImage) {
      let shouldDeselect = false;
      if (
        unifiedSelectedImage.tab === 'gallery' &&
        unifiedSelectedImage.indexInFullArray >= images.length
      ) {
        shouldDeselect = true;
      } else if (
        unifiedSelectedImage.tab === 'compare' &&
        unifiedSelectedImage.indexInFullArray >= compareImages.length
      ) {
        shouldDeselect = true;
      }
      if (shouldDeselect) {
        setUnifiedSelectedImage(null);
      }
    }
  }, [images, compareImages, unifiedSelectedImage]);

  // Effect to synchronize zoom/pan across all visible canvases for the current tab
  useEffect(() => {
    const transformToApply =
      activeTab === 'gallery' ? gallerySyncedTransform : compareSyncedTransform;

    if (transformToApply && canvasRefs.current) {
      canvasRefs.current.forEach(canvasInstance => {
        if (
          canvasInstance &&
          !canvasInstance.isDisposed &&
          canvasInstance.backgroundImage // Ensure there's an image to transform
        ) {
          const currentZoom = canvasInstance.getZoom();
          const currentX = canvasInstance.viewportTransform
            ? canvasInstance.viewportTransform[4]
            : 0;
          const currentY = canvasInstance.viewportTransform
            ? canvasInstance.viewportTransform[5]
            : 0;

          // Apply transform if different enough (to avoid minor floating point re-renders)
          if (
            Math.abs(currentZoom - transformToApply.zoom) > 1e-6 ||
            Math.abs(currentX - transformToApply.x) > 1e-6 ||
            Math.abs(currentY - transformToApply.y) > 1e-6
          ) {
            canvasInstance.setZoom(transformToApply.zoom);
            if (canvasInstance.viewportTransform) {
              canvasInstance.viewportTransform[4] = transformToApply.x;
              canvasInstance.viewportTransform[5] = transformToApply.y;
            }
            canvasInstance.requestRenderAll();
          }
        }
      });
    }
  }, [gallerySyncedTransform, compareSyncedTransform, activeTab]); // Re-run if transforms or tab change

  // Effect to update cursor style on canvas elements based on panning state
  useEffect(() => {
    const cursorClass = isPanning ? 'grabbing' : 'grab';
    const antiCursorClass = isPanning ? 'grab' : 'grabbing';

    canvasElementRefs.current.forEach(canvasDOMEl => {
      if (canvasDOMEl) {
        canvasDOMEl.classList.add(cursorClass);
        canvasDOMEl.classList.remove(antiCursorClass);
      }
    });
    canvasRefs.current.forEach(canvasInstance => {
      if (canvasInstance && !canvasInstance.isDisposed) {
        canvasInstance.defaultCursor = cursorClass;
        canvasInstance.hoverCursor = cursorClass;
      }
    });
  }, [isPanning]); // Only depends on the panning state

  return (
    <div
      className={`grid-image-gallery-widget widget layout-${getCurrentLayout()}`}
    >
      <div className="gallery-controls">
        <div className="left-section">
          {imagesForCurrentView.length > gridDimensions.total && (
            <div className="gallery-nav-buttons">
              <span className="gallery-page-indicator">
                {currentPageForCurrentView + 1}/{totalPagesForCurrentView}
              </span>
              <button
                className="gallery-nav-button"
                onClick={() => handleNavigationForCurrentView('prev')}
                disabled={isNavButtonDisabled('prev')}
                title="Previous page"
              >
                <LeftArrowIcon />
              </button>
              <button
                className="gallery-nav-button"
                onClick={() => handleNavigationForCurrentView('next')}
                disabled={isNavButtonDisabled('next')}
                title="Next page"
              >
                <RightArrowIcon />
              </button>
            </div>
          )}
        </div>
        <div className="center-section">
          <div className="layout-inputs">
            <div className="input-group">
              <input
                id="grid-rows"
                type="number"
                min="1"
                max="5"
                value={layoutInput[0]}
                onChange={e => handleLayoutChange(e, 'row')}
                onBlur={e => handleBlur(e, 'row')}
                aria-label="Grid rows"
                className={`layout-input ${
                  validationError.row ? 'input-error' : ''
                }`}
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
                max="5"
                value={layoutInput[1]}
                onChange={e => handleLayoutChange(e, 'col')}
                onBlur={e => handleBlur(e, 'col')}
                aria-label="Grid columns"
                className={`layout-input ${
                  validationError.col ? 'input-error' : ''
                }`}
              />
              {validationError.col && (
                <div className="validation-error">{validationError.col}</div>
              )}
            </div>
          </div>
        </div>
        <div className="right-section">
          <div className="gallery-tabs">
            <button
              className={`tab-button ${
                activeTab === 'gallery' ? 'active' : ''
              }`}
              onClick={() => {
                setActiveTab('gallery');
                editorContext?.action('menu').close();
              }}
            >
              Gallery
            </button>
            <button
              className={`tab-button ${
                activeTab === 'compare' ? 'active' : ''
              }`}
              onClick={() => {
                setActiveTab('compare');
                editorContext?.action('menu').close();
              }}
            >
              Compare ({compareImages.length})
            </button>
          </div>
        </div>
      </div>

      <div
        className="gallery-grid"
        style={{
          gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`,
          gridAutoRows: 'auto', // Let rows size automatically based on content (canvas height)
          gridAutoFlow: 'row', // Default, but good to be explicit
          gap: '10px'
        }}
      >
        {gridDimensions.total > 0 &&
          imagesForCurrentView &&
          canvasKeys
            .slice(0, gridDimensions.total) // Only map over the number of cells in the current grid
            .map((canvasDomId, indexInGrid) => {
              const imageIndexInViewArray =
                pageStartIndexForCurrentView + indexInGrid;
              const hasImage =
                imageIndexInViewArray < imagesForCurrentView.length;
              const imageInThisCell = hasImage
                ? imagesForCurrentView[imageIndexInViewArray]
                : null;
              const isSelected =
                unifiedSelectedImage?.tab === activeTab &&
                unifiedSelectedImage?.indexInFullArray ===
                  imageIndexInViewArray;

              // Construct a more robust key
              const cellKey = `${activeTab}-${canvasDomId}-${
                imageInThisCell ? imageInThisCell.filename : 'empty'
              }-${currentPageForCurrentView}-${imageIndexInViewArray}`;

              return (
                <div
                  key={cellKey}
                  className={`gallery-cell cell-${indexInGrid} ${
                    isSelected ? 'selected' : ''
                  } ${!hasImage ? 'empty' : ''}`}
                  style={{
                    height: `${cellHeight}px`, // Ensure consistent cell height
                    minHeight: '50px', // Minimum height
                    position: 'relative' // For positioning delete button
                  }}
                  onClick={
                    hasImage && !isPanning // Only clickable if has image and not panning
                      ? () => handleCellClickForCurrentView(indexInGrid)
                      : undefined
                  }
                  onContextMenu={(e: React.MouseEvent) => {
                    e.preventDefault(); // Prevent default browser context menu
                    e.stopPropagation(); // Stop event from bubbling up

                    // Open custom context menu only for gallery tab, if image exists, and editor context is available
                    if (
                      activeTab === 'gallery' &&
                      hasImage &&
                      imageInThisCell && // Make sure imageInThisCell is not null
                      editorContext?.action // Check if editorContext and action method exist
                    ) {
                      const menuAction = editorContext.action('menu');
                      // Check if menuAction and its open method are available
                      if (menuAction && typeof menuAction.open === 'function') {
                        menuAction.open('gridImageMenu', e, {
                          forWhom: imageInThisCell, // Pass the specific image data
                          handleAddToCompare: handleAddToCompare, // Pass the handler
                          editorContext: editorContext // Pass editor context if needed by the menu
                        });
                      } else {
                        console.error(
                          '[DEBUG] menuAction.open is not available or not a function.',
                          menuAction
                        );
                      }
                    }
                  }}
                  title={
                    hasImage
                      ? `Image ${imageIndexInViewArray + 1}${
                          activeTab === 'gallery'
                            ? ' (Right-click for options)'
                            : ''
                        }`
                      : 'No image'
                  }
                >
                  <canvas
                    id={canvasDomId}
                    className={isPanning ? 'grabbing' : 'grab'}
                  />
                  {isSelected &&
                    hasImage && ( // Show delete button only if selected and has image
                      <button
                        className="delete-image-button"
                        onClick={e => {
                          e.stopPropagation(); // Prevent cell click when deleting
                          if (activeTab === 'gallery' && onDeleteImage) {
                            handleDeleteFromGallery(imageIndexInViewArray);
                          } else if (activeTab === 'compare') {
                            handleDeleteFromCompareList(imageIndexInViewArray);
                          }
                        }}
                        title={`Remove this image ${
                          activeTab === 'gallery'
                            ? 'from gallery'
                            : 'from compare list'
                        }`}
                      >
                        &times;
                      </button>
                    )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
