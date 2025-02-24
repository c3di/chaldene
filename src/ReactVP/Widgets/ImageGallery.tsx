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
  images
}: IImageGalleryProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(150);
  const [isAllSelected, setIsAllSelected] = useState(false);

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

      // Calculate layout
      const containerWidth = canvas.width! - 15;
      const padding = 15;
      const minThumbSize = 80;
      const numCols = Math.max(
        1,
        Math.floor((containerWidth + padding) / (minThumbSize + padding))
      );
      const thumbSize = Math.floor(
        (containerWidth - (numCols - 1) * padding) / numCols
      );

      let maxBottom = 0;
      const strokePadding = 2;
      thumbnails.forEach(({ fabricObject }, index) => {
        if (!fabricObject) {
          return;
        }

        const col = index % numCols;
        const row = Math.floor(index / numCols);
        const scale = calculateScale(
          fabricObject,
          thumbSize - strokePadding * 2
        );
        const scaledHeight = fabricObject.height! * scale;
        const position = {
          left: 5 + col * (thumbSize + padding) + strokePadding,
          top: 5 + row * (scaledHeight + padding) + strokePadding
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
        maxBottom = Math.max(maxBottom, position.top + scaledHeight);
      });

      const newHeight = thumbnails.length > 0 ? maxBottom + padding : 150;
      setCanvasHeight(newHeight);
      canvas.setHeight(newHeight);
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

        const processed = await Promise.all(
          images.map(async img => {
            const existing = canvas
              .getObjects()
              .find(
                o => (o as GalleryImage).data?.filename === img.filename
              ) as GalleryImage | undefined;

            if (existing) {
              return { ...img, fabricObject: existing };
            }

            const fabricImg = await new Promise<GalleryImage>(
              (resolve, reject) => {
                fabric.FabricImage.fromURL(img.base64 || img.imageUrl!)
                  .then(imgElement => {
                    const galleryImage = new GalleryImage(
                      imgElement.getElement(),
                      {
                        data: { filename: img.filename },
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
    [arrangeThumbnails]
  );

  const handleSelection = useCallback(
    (targets: GalleryImage | GalleryImage[], shiftKey: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const allGalleryImages = canvas
        .getObjects()
        .filter(obj => obj instanceof GalleryImage) as GalleryImage[];
      const targetsArray = Array.isArray(targets) ? targets : [targets];
      const isSelectAll = targetsArray.length === allGalleryImages.length;

      // Handle selection state
      if (isSelectAll) {
        const newState = !isAllSelected;
        allGalleryImages.forEach(img => {
          img.toggleSelection(newState);
        });
      } else {
        if (!shiftKey) {
          allGalleryImages.forEach(img => {
            if (!targetsArray.includes(img)) {
              img.toggleSelection(false);
            }
          });
        }
        targetsArray.forEach(target => {
          target.toggleSelection(!target.selected);
        });
      }

      const selectedImages = allGalleryImages.filter(obj => obj.selected);
      const filenames = selectedImages
        .map(o => o.data?.filename)
        .filter(Boolean) as string[];
      setValue?.(forWhom, filenames);
      setIsAllSelected(selectedImages.length === allGalleryImages.length);
      canvas.requestRenderAll();
    },
    [setValue, forWhom]
  );

  const handleSelectAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    handleSelection(
      canvas
        .getObjects()
        .filter(obj => obj instanceof GalleryImage) as GalleryImage[],
      false
    );
  }, [isAllSelected, setValue, forWhom]);

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

  const handleMoveSelection = useCallback(
    (direction: 'left' | 'right') => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      const objects = canvas.getObjects() as GalleryImage[];
      const activeObjects = canvas.getActiveObjects() as GalleryImage[];
      if (activeObjects.length === 0) {
        return;
      }

      const currentIndex = objects.indexOf(activeObjects[0]);
      const newIndex =
        direction === 'left'
          ? Math.max(0, currentIndex - 1)
          : Math.min(objects.length - 1, currentIndex + 1);

      if (currentIndex !== newIndex) {
        handleSelection(objects[newIndex], false);
      }
    },
    [handleSelection]
  );

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

  return (
    <div className="image-gallery-widget widget">
      <div className="gallery-controls">
        <button
          onClick={() => handleMoveSelection('left')}
          disabled={
            !canvasRef.current ||
            canvasRef.current.getActiveObjects().length === 0
          }
        >
          <LeftArrowIcon />
        </button>
        <button
          onClick={() => handleMoveSelection('right')}
          disabled={
            !canvasRef.current ||
            canvasRef.current.getActiveObjects().length === 0
          }
        >
          <RightArrowIcon />
        </button>
        <button
          onClick={handleSelectAll}
          disabled={
            !canvasRef.current || canvasRef.current.getObjects().length === 0
          }
        >
          <SelectionIcon showCheck={isAllSelected} />
        </button>
      </div>
      <canvas
        id={canvasKey}
        width="100%"
        height={canvasHeight}
        style={{ contain: 'strict' }}
      />
      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
