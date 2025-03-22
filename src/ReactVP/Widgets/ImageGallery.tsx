/* eslint-disable @typescript-eslint/naming-convention */
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';
import { LeftArrowIcon, RightArrowIcon, SelectionIcon } from '../Style/icons';

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
  fabricObject?: GalleryImage;
}

interface IImageGalleryProps extends WidgetProps {
  images?: IGalleryImage[];
  value?: string[];
}
class GalleryImage extends fabric.FabricImage {
  public selected: boolean = false;

  constructor(
    element: fabric.ImageSource,
    options?: Partial<fabric.ImageProps>
  ) {
    super(element, {
      ...options,
      hasControls: false,
      selectable: false,
      lockMovementX: true,
      lockMovementY: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hoverCursor: 'pointer',
      borderScaleFactor: 2,
      hasBorders: false,
      objectCaching: false,
      strokeWidth: 2,
      strokeUniform: true,
      padding: 2,
      originX: 'left',
      originY: 'top'
    });
  }

  toggleSelection(selected: boolean): void {
    if (this.selected === selected) {
      return;
    }

    this.selected = selected;
    this.set({
      stroke: selected ? '#1976d2' : 'transparent',
      hasBorders: false,

      dirty: true // Force redraw
    });

    if (selected && this.canvas) {
      this.canvas.bringObjectToFront(this);
    }
  }
}

export function ImageGallery({
  forWhom,
  setValue,
  images,
  value
}: IImageGalleryProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(150);
  const containerHeightRef = useRef<number>(250);
  const [selectionVersion, setSelectionVersion] = useState(0);

  // Helper function to get sorted gallery objects
  const getSortedGalleryObjects = useCallback(() => {
    if (!canvasRef.current) {
      return [];
    }

    const allObjects = canvasRef.current.getObjects() as GalleryImage[];
    return [...allObjects].sort(
      (a, b) => (a.data?.originalIndex || 0) - (b.data?.originalIndex || 0)
    );
  }, []);

  // Helper function to get selected filenames in proper order
  const getSelectedFilenames = useCallback((objects: GalleryImage[]) => {
    return objects
      .filter(obj => obj.selected)
      .map(obj => obj.data?.filename)
      .filter(Boolean) as string[];
  }, []);

  // Derive isAllSelected directly as a memoized value
  const isAllSelected = useMemo(() => {
    const sortedObjects = getSortedGalleryObjects();
    return sortedObjects.length > 0 && sortedObjects.every(obj => obj.selected);
  }, [getSortedGalleryObjects, selectionVersion]);

  // Update selection and notify parent component
  const updateSelection = useCallback(
    (selectedFilenames: string[]) => {
      setValue?.(forWhom, selectedFilenames);
      setSelectionVersion(prev => prev + 1);

      if (canvasRef.current) {
        canvasRef.current.requestRenderAll();
      }
    },
    [setValue, forWhom]
  );

  const handleSelection = useCallback(
    (targets: GalleryImage | GalleryImage[], shiftKey: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      // Always work with sorted objects for consistent behavior
      const sortedObjects = getSortedGalleryObjects();
      const targetsArray = Array.isArray(targets) ? targets : [targets];

      // Handle "Select All" case - when all objects are targets
      if (targetsArray.length === sortedObjects.length) {
        // Get current all-selected state
        const currentIsAllSelected = sortedObjects.every(img => img.selected);

        // Toggle all selections based on current state
        sortedObjects.forEach(img => {
          img.toggleSelection(!currentIsAllSelected);
        });

        // Update selected filenames in the proper order
        const filenames = !currentIsAllSelected
          ? getSelectedFilenames(sortedObjects)
          : [];

        updateSelection(filenames);
        return;
      }

      // Single thumbnail clicked without shift key
      if (targetsArray.length === 1 && !shiftKey) {
        // Deselect all images first
        sortedObjects.forEach(img => {
          img.toggleSelection(false);
        });

        // Select the clicked target
        const target = targetsArray[0];
        target.toggleSelection(true);

        // Update with just this filename
        const filename = target.data?.filename;
        if (filename) {
          updateSelection([filename]);
        }
      } else {
        // Shift key is pressed for multi-selection
        // Track currently selected items before making changes
        const previouslySelected = getSelectedFilenames(sortedObjects);

        // Only deselect others if shift key is not used
        if (!shiftKey) {
          sortedObjects.forEach(img => {
            if (!targetsArray.includes(img)) {
              img.toggleSelection(false);
            }
          });
        }

        // Toggle selection state for the target(s)
        targetsArray.forEach(target => {
          target.toggleSelection(!target.selected);
        });

        // For shift selections, maintain selection order
        let filenames: string[];

        if (shiftKey && previouslySelected.length > 0) {
          // Get current selection
          const currentSelection = getSelectedFilenames(sortedObjects);

          // Keep previously selected items that are still selected
          const keptFilenames = previouslySelected.filter(name =>
            currentSelection.includes(name)
          );

          // Add newly selected items (ones not in previous selection)
          const addedFilenames = currentSelection.filter(
            name => !previouslySelected.includes(name)
          );

          // Combine in order: kept + newly added
          filenames = [...keptFilenames, ...addedFilenames];
        } else {
          // Use image order for non-shift selections
          filenames = getSelectedFilenames(sortedObjects);
        }

        updateSelection(filenames);
      }
    },
    [getSortedGalleryObjects, getSelectedFilenames, updateSelection]
  );

  const handleSelectAll = useCallback(() => {
    const sortedObjects = getSortedGalleryObjects();
    if (sortedObjects.length === 0) {
      return;
    }

    handleSelection(sortedObjects, false);
  }, [getSortedGalleryObjects, handleSelection]);

  // Memoized button disabled state function
  const isDirectionButtonDisabled = useCallback(
    (direction: 'left' | 'right') => {
      if (!canvasRef.current) {
        return true;
      }

      const sortedObjects = getSortedGalleryObjects();
      if (sortedObjects.length === 0) {
        return true;
      }

      const selectedObjects = sortedObjects.filter(obj => obj.selected);
      if (selectedObjects.length === 0) {
        return true;
      }

      const currentIndex = sortedObjects.indexOf(selectedObjects[0]);

      // Disable left button if first item is selected
      // Disable right button if last item is selected
      return direction === 'left'
        ? currentIndex === 0
        : currentIndex === sortedObjects.length - 1;
    },
    [getSortedGalleryObjects]
  );

  const handleMoveSelection = useCallback(
    (direction: 'left' | 'right') => {
      if (isDirectionButtonDisabled(direction)) {
        return;
      }

      const sortedObjects = getSortedGalleryObjects();
      if (sortedObjects.length === 0) {
        return;
      }

      // Find selected objects
      const selectedObjects = sortedObjects.filter(obj => obj.selected);
      if (selectedObjects.length === 0) {
        return;
      }

      // Find current index in the sorted array
      const currentIndex = sortedObjects.indexOf(selectedObjects[0]);
      const newIndex =
        direction === 'left'
          ? Math.max(0, currentIndex - 1)
          : Math.min(sortedObjects.length - 1, currentIndex + 1);

      if (currentIndex !== newIndex) {
        handleSelection(sortedObjects[newIndex], false);
      }
    },
    [handleSelection, getSortedGalleryObjects, isDirectionButtonDisabled]
  );

  const canvasKey = useMemo(() => {
    const id = typeof forWhom === 'object' ? forWhom.id : String(forWhom);
    return `gallery-${id}`;
  }, [forWhom]);

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

  const calculateScale = useCallback(
    (img: GalleryImage, finalThumbSize: number) => {
      return Math.min(
        finalThumbSize / img.width!,
        finalThumbSize / img.height!
      );
    },
    []
  );

  const arrangeThumbnails = useCallback(
    (thumbnails: IGalleryImage[], canvas: fabric.Canvas) => {
      if (canvas.isDisposed) {
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
      const numCols = 3; // Fixed to 3 columns as requested

      // Use the exact calculation specified
      const availableWidth = canvas.width! - padding * numCols;
      const gridSize = Math.floor(availableWidth / numCols);

      let maxBottom = 0;
      const strokePadding = 2;
      thumbnails.forEach(({ fabricObject }, index) => {
        if (!fabricObject) {
          return;
        }

        const col = index % numCols;
        const row = Math.floor(index / numCols);

        // Calculate scale to fit the image in the grid while maintaining aspect ratio
        const scale = calculateScale(
          fabricObject,
          gridSize - strokePadding * 2
        );

        const scaledWidth = fabricObject.width! * scale;
        const scaledHeight = fabricObject.height! * scale;

        // Center the image in the grid
        const leftOffset = (gridSize - scaledWidth) / 2;
        const topOffset = (gridSize - scaledHeight) / 2;

        // Calculate expected grid position (top-left corner of the grid)
        // Use leftPadding for the first column, and regular padding for others
        const gridLeft = col * (gridSize + padding);
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

        // Calculate max bottom based on grid size rather than scaled height
        maxBottom = Math.max(
          maxBottom,
          padding + (row + 1) * (gridSize + padding)
        );
      });

      const newHeight = thumbnails.length > 0 ? maxBottom : 150;
      setCanvasHeight(newHeight);
      canvas.setHeight(newHeight);

      // Update container class based on if scrolling is needed
      const container = canvas.wrapperEl?.parentElement;
      if (container) {
        container.classList.toggle(
          'needs-scroll',
          newHeight > containerHeightRef.current
        );
      }

      canvas.renderAll();
    },
    [calculateScale]
  );

  const loadImages = useCallback(
    async (canvas: fabric.Canvas, images: IGalleryImage[]) => {
      try {
        if (canvas.isDisposed) {
          return;
        }
        setLoading(true);
        setError(null);

        // Store existing selection state before processing
        const existingSelections = canvas
          .getObjects()
          .filter((obj: any) => obj instanceof GalleryImage && obj.selected)
          .map((obj: any) => obj.data?.filename)
          .filter(Boolean);

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
          arrangeThumbnails(processed, canvas);

          // After arranging, restore selection state
          const allObjects = canvas.getObjects() as GalleryImage[];

          // First prioritize value prop if it exists (for notebook reload case)
          if (value && value.length > 0) {
            allObjects.forEach(obj => {
              if (obj.data?.filename) {
                obj.toggleSelection(value.includes(obj.data.filename));
              }
            });
          }
          // Otherwise use existing selections (for within-session changes)
          else if (existingSelections.length > 0) {
            allObjects.forEach(obj => {
              if (obj.data?.filename) {
                obj.toggleSelection(
                  existingSelections.includes(obj.data.filename)
                );
              }
            });
          }

          canvas.requestRenderAll();
          setSelectionVersion(prev => prev + 1);
        }
      } catch (err) {
        console.error('[Load] Failed:', err);
        setError('Failed to load images');
      } finally {
        if (!canvas.isDisposed) {
          setLoading(false);
        }
      }
    },
    [arrangeThumbnails, value]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.on('mouse:down', e => {
      if (e.target && e.target instanceof GalleryImage) {
        handleSelection(e.target, e.e.shiftKey);
      }
    });

    return () => {
      canvas.off('mouse:down');
    };
  }, [handleSelection]);

  useEffect(() => {
    const canvasElement = document.getElementById(canvasKey);
    if (!canvasElement) {
      return;
    }

    while (canvasElement.firstChild) {
      canvasElement.removeChild(canvasElement.firstChild);
    }

    const parentWidth = canvasElement.parentElement?.clientWidth || 500;
    const newCanvas = new fabric.Canvas(canvasKey, {
      width: parentWidth,
      height: canvasHeight,
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

    canvasRef.current = newCanvas;
    if (stableImages) {
      loadImages(newCanvas, stableImages);
    }

    // Get container's max height for scroll calculations
    const parentElement = canvasElement.parentElement;
    if (parentElement) {
      const computedStyle = window.getComputedStyle(parentElement);
      containerHeightRef.current = parseInt(
        computedStyle.maxHeight || '250',
        10
      );
    }

    return () => {
      newCanvas.dispose();
      canvasRef.current = null;
    };
  }, [canvasKey, canvasHeight]);

  useEffect(() => {
    if (!canvasRef.current || !stableImages) {
      return;
    }
    loadImages(canvasRef.current, stableImages);
  }, [stableImages, loadImages]);

  // Clean up all fabric objects when component unmounts
  useEffect(() => {
    return () => {
      const canvas = canvasRef.current;
      if (canvas) {
        // Clear all objects and dispose properly
        canvas.getObjects().forEach(obj => canvas.remove(obj));
        canvas.dispose();
        canvasRef.current = null;
      }
    };
  }, []);

  return (
    <div className="image-gallery-widget widget">
      <div className="gallery-controls">
        <button
          onClick={() => handleMoveSelection('left')}
          disabled={isDirectionButtonDisabled('left')}
        >
          <LeftArrowIcon />
        </button>
        <button
          onClick={() => handleMoveSelection('right')}
          disabled={isDirectionButtonDisabled('right')}
        >
          <RightArrowIcon />
        </button>
        <button
          onClick={handleSelectAll}
          disabled={
            !canvasRef.current || getSortedGalleryObjects().length === 0
          }
        >
          <SelectionIcon showCheck={isAllSelected} />
        </button>
      </div>
      <div className="canvas-container">
        <canvas
          id={canvasKey}
          width="100%"
          height={canvasHeight}
          style={{ contain: 'strict' }}
        />
      </div>
      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
