import { useCallback } from 'react';
import CanvasImage from './CanvasImageInCrop';
import { type WidgetProps } from './Widget';
import ReactCrop, { type Crop } from './ReactCrop';
import { type Identifier, type BoundingBox } from '../Type';
import 'react-image-crop/dist/ReactCrop.css';

interface IImageCropperProps extends WidgetProps {
  value: BoundingBox;
  setValue: (identifier?: Identifier, value?: BoundingBox) => void;
  image: HTMLImageElement | null;
}

export default function ImageCropper({
  forWhom,
  value,
  setValue,
  image,
  editorContext
}: IImageCropperProps): JSX.Element {
  const onchange = useCallback(
    ({ x, y, width, height }: Crop): void => {
      setValue(forWhom, { x, y, width, height });
    },
    [setValue, forWhom]
  );
  const scale = editorContext?.action('scene')?.getZoom() ?? 1;

  return (
    <div
      className="image-cropper-wrapper"
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      // style={{ transform: `scale(${0.5})` }}
    >
      <ReactCrop
        crop={{ ...value, unit: 'px' }}
        onComplete={onchange}
        onChange={onchange}
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        scale={scale}
      >
        <CanvasImage value={image} zoomable={false} translateable={false} />
      </ReactCrop>
    </div>
  );
}
