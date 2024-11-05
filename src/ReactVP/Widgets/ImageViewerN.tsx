import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { WidgetProps } from './Widget';

interface IImageViewerProps extends WidgetProps {
  value?: {
    imageUrl: string;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

const getPointerCoordinates = (e: Event) => {
  if (e instanceof MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  } else if (e instanceof TouchEvent && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: 0, y: 0 };
};

export default function ImageViewer({
  value,
  editorContext
}: IImageViewerProps): JSX.Element {
  const canvasElParent = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const canvas = useRef<fabric.Canvas | null>(null);
  const [image, setImage] = useState<fabric.FabricImage | null>(null);
  const isPanning = useRef(false);
  const lastPosX = useRef(0);
  const lastPosY = useRef(0);

  const updateGlobalTransform = () => {
    if (!editorContext) {
      return;
    }
    // todo: push to update all re-render?
    const viewportTransform = canvas.current!.viewportTransform;
    editorContext.updateGlobalTransform({
      x: viewportTransform[4],
      y: viewportTransform[5],
      zoom: canvas.current?.getZoom() ?? 1
    });
  };

  const updateLastPox = (x: number, y: number) => {
    lastPosX.current = x;
    lastPosY.current = y;
    updateGlobalTransform();
  };

  function resizeCanvas() {
    const parent = canvasElParent.current;
    canvas.current?.setDimensions({
      width: parent?.clientWidth ?? 0,
      height: parent?.clientHeight ?? 0
    });
    canvas.current?.renderAll();
  }

  useEffect(() => {
    if (!canvasElement.current || !canvasElParent.current) {
      return;
    }
    canvas.current = new fabric.Canvas(canvasElement.current, {
      selection: false
    });

    canvas.current.on('mouse:down', opt => {
      isPanning.current = true;
      const { x, y } = getPointerCoordinates(opt.e);
      updateLastPox(x, y);
    });

    canvas.current.on('mouse:move', opt => {
      if (isPanning.current && canvas.current) {
        const viewportTransform = canvas.current!.viewportTransform;
        const { x, y } = getPointerCoordinates(opt.e);
        viewportTransform[4] += x - lastPosX.current;
        viewportTransform[5] += y - lastPosY.current;
        canvas.current?.renderAll();
        updateLastPox(x, y);
      }
    });

    canvas.current.on('mouse:up', () => {
      isPanning.current = false;
    });

    canvas.current.on('mouse:wheel', opt => {
      if (!canvas.current) {
        return;
      }
      const delta = opt.e.deltaY;
      let zoom = canvas.current.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.05, zoom);
      zoom = Math.min(5, zoom);
      const deltaPoint = new fabric.Point(opt.e.offsetX, opt.e.offsetY);
      canvas.current.zoomToPoint(deltaPoint, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
      console.log('zoom', zoom);
      updateGlobalTransform();
    });

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => {
      canvas.current?.dispose();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    if (!canvas.current || !value?.imageUrl) {
      return;
    }
    canvas.current.clear();
    fabric.FabricImage.fromURL(value.imageUrl)
      .then((img: fabric.Image) => {
        if (canvas.current?.backgroundImage === img) {
          return;
        }
        setImage(img);
      })
      .catch(err => {
        console.error('Failed to load image', err);
      });
  }, [value?.imageUrl]);

  useEffect(() => {
    if (!canvas.current || !image) {
      return;
    }
    const {
      x: asyncX,
      y: asyncY,
      zoom: asyncZoom
    } = editorContext?.getImageViewTransform() ?? {};

    const scaleFactor =
      asyncZoom ??
      Math.min(
        canvas.current!.width / image.width,
        canvas.current!.height / image.height
      );
    // Set the canvas zoom to fit the image without scaling the image itself
    canvas.current!.setZoom(scaleFactor);

    canvas.current!.backgroundImage = image;
    const zoom = canvas.current!.getZoom();
    const viewportTransform = canvas.current!.viewportTransform;

    // Calculate the translation to center the image
    const centerX = (canvas.current!.width - image.width * zoom) / 2;
    const centerY = (canvas.current!.height - image.height * zoom) / 2;

    if (viewportTransform) {
      viewportTransform[4] = asyncX ?? centerX;
      viewportTransform[5] = asyncY ?? centerY;
    }

    canvas.current!.renderAll();
  }, [editorContext?.getImageViewTransform(), image]);

  return (
    <div>
      <div
        ref={canvasElParent}
        className={'nodrag nowheel widget common-input-style'}
        style={{
          width: '100%',
          height: '100%',
          padding: 0
        }}
      >
        <canvas
          ref={canvasElement}
          className={`nodrag nowheel widget imageview ${isPanning.current ? 'grabbing' : 'grab'}`}
        />
      </div>
      <div
        className="image-info"
        style={{
          marginBottom: '0px',
          textAlign: 'center',
          fontSize: 'var(--vpl-ui-font-size1)',
          fontFamily: 'var(--vpl-ui-font-family)',
          color: 'var(--vpl-ui-font-color2)'
        }}
      >
        {value?.dimensions && (
          <span>
            {value.dimensions.width} x {value.dimensions.height}
          </span>
        )}
      </div>
    </div>
  );
}
