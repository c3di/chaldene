import { useEffect, useState } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';

interface IThumbnailImage {
  filename: string;
  selected: boolean;
  fabricObject?: fabric.Image;
}

export function ImageGallery({
  forWhom,
  value,
  setValue,
  editorContext
}: WidgetProps): JSX.Element {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [images, setImages] = useState<IThumbnailImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thumbnailSize = 100;
  const padding = 10;

  // Initialize canvas
  useEffect(() => {
    const canvasElement = document.getElementById(`gallery-canvas-${forWhom}`);
    if (!canvasElement) {
      return;
    }

    const newCanvas = new fabric.Canvas(`gallery-canvas-${forWhom}`, {
      width: 500,
      height: 300,
      selection: false
    });
    setCanvas(newCanvas);

    return () => {
      newCanvas.dispose();
    };
  }, [forWhom]);

  // Load images when folder path changes
  useEffect(() => {
    if (!canvas) {
      return;
    }

    try {
      // Get the folder path value from the graph
      const folderPath = editorContext?.graph?.nodes
        ?.find(node => node.id === forWhom?.nodeID)
        ?.data.inputs?.find(input => input.name === 'folderPath')?.defaultValue;

      if (!folderPath) {
        setError('Please select a folder first');
        return;
      }

      setLoading(true);
      setError(null);

      // Clear existing images
      canvas.getObjects().forEach(obj => canvas.remove(obj));
      canvas.renderAll();
      setImages([]);

      // Request images from the folder
      editorContext?.parentContext
        ?.getImagesFromFolder?.(folderPath)
        .then((imageList: { filename: string; base64: string }[]) => {
          console.log(
            '[Debug] ImageGallery - Received images:',
            imageList.length
          );
          if (!canvas) {
            console.log('[Debug] ImageGallery - Canvas no longer exists');
            return;
          }

          Promise.all(
            imageList.map(
              img =>
                new Promise<IThumbnailImage>(resolve => {
                  console.log(
                    '[Debug] ImageGallery - Loading image:',
                    img.filename
                  );
                  fabric.FabricImage.fromURL(img.base64).then(
                    (fabricImg: fabric.Image) => {
                      // Scale image to thumbnail size
                      const scale = Math.min(
                        thumbnailSize / fabricImg.width!,
                        thumbnailSize / fabricImg.height!
                      );
                      fabricImg.scale(scale);

                      fabricImg.set({
                        selectable: true,
                        hasBorders: true,
                        hasControls: false
                      });

                      resolve({
                        filename: img.filename,
                        selected: false,
                        fabricObject: fabricImg
                      });
                    }
                  );
                })
            )
          ).then(thumbnails => {
            console.log(
              '[Debug] ImageGallery - Loaded thumbnails:',
              thumbnails.length
            );
            if (!canvas) {
              return;
            }
            setImages(thumbnails);
            arrangeThumbnails(thumbnails, canvas);
          });
        })
        .catch((err: Error) => {
          console.error('[Debug] ImageGallery - Error loading images:', err);
          setError(`Error loading images: ${err.message}`);
        })
        .finally(() => {
          console.log('[Debug] ImageGallery - Finished loading attempt');
          setLoading(false);
        });
    } catch (error) {
      console.error('[Debug] ImageGallery - Error in effect:', error);
      setError('Failed to load images');
      setLoading(false);
    }
  }, [canvas, editorContext?.graph]);

  // Arrange thumbnails in a grid
  const arrangeThumbnails = (
    thumbnails: IThumbnailImage[],
    canvas: fabric.Canvas
  ) => {
    try {
      // Clear existing objects
      canvas.getObjects().forEach(obj => canvas.remove(obj));
      canvas.renderAll();

      let row = 0;
      let col = 0;
      const maxCols = Math.floor(canvas.getWidth() / (thumbnailSize + padding));

      thumbnails.forEach(({ fabricObject }) => {
        if (fabricObject) {
          fabricObject.set({
            left: col * (thumbnailSize + padding) + padding,
            top: row * (thumbnailSize + padding) + padding
          });
          canvas.add(fabricObject);

          col++;
          if (col >= maxCols) {
            col = 0;
            row++;
          }
        }
      });

      canvas.renderAll();
    } catch (error) {
      console.error('Error arranging thumbnails:', error);
    }
  };

  // Handle selection changes
  useEffect(() => {
    if (!canvas) {
      return;
    }

    canvas.on('selection:created', e => handleSelection(e));
    canvas.on('selection:updated', e => handleSelection(e));
    canvas.on('selection:cleared', () => handleSelection());

    return () => {
      canvas.off('selection:created');
      canvas.off('selection:updated');
      canvas.off('selection:cleared');
    };
  }, [canvas, images]);

  const handleSelection = (e?: { selected?: fabric.Object[] }) => {
    const selectedObject = e?.selected?.[0];
    const updatedImages = images.map(img => ({
      ...img,
      selected: img.fabricObject === selectedObject
    }));
    setImages(updatedImages);

    // Update the widget value with selected filenames or empty array if nothing selected
    const selectedFilenames = updatedImages
      .filter(img => img.selected)
      .map(img => img.filename); // Just use filename without path
    setValue?.(forWhom, selectedFilenames.length > 0 ? selectedFilenames : []);
  };

  return (
    <div className="image-gallery-widget widget">
      <canvas id={`gallery-canvas-${forWhom}`} width={500} height={300} />
      {loading && <div className="gallery-loading">Loading images...</div>}
      {error && <div className="gallery-error">{error}</div>}
    </div>
  );
}
