import { useEffect, useRef, useState } from 'react';
import ImageCropper from './ImageCropper';
import { type WidgetProps } from './Widget';
import { type Identifier, type BoundingBox } from '../Type';

function toBoundedUInt(value: string | number, max: number | null): number {
  const v = typeof value === 'string' ? parseInt(value) : value;
  if (max === null) {
    return v;
  }
  return Math.min(max, Math.max(0, v));
}

interface IBoundingBoxInputProps extends WidgetProps {
  value: BoundingBox;
  setValue: (identifier?: Identifier, value?: BoundingBox) => void;
  image: string;
}

export default function BoundingBoxInput({
  forWhom,
  value,
  setValue,
  editorContext,
  image: ImageStr
}: IBoundingBoxInputProps): JSX.Element {
  const { x, y, height, width } = value || { x: 0, y: 0, height: 0, width: 0 };
  const maxImageWidth = useRef<number | null>(null);
  const maxImageHeight = useRef<number | null>(null);

  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const imageToDraw = new Image();
    imageToDraw.onload = () => {
      const { width, height } = imageToDraw;
      maxImageWidth.current = width;
      maxImageHeight.current = height;
      setImage(imageToDraw);
      if (!value) {
        setValue(forWhom, {
          x: 0,
          y: 0,
          width,
          height
        });
      }
    };
    imageToDraw.src = ImageStr;
  }, [value]);

  return (
    <div
      className="bounding-box-container"
      style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
    >
      <div className="input-row" style={{ display: 'flex', gap: '8px' }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label
            htmlFor="xInput"
            style={{ marginRight: '4px', fontSize: '13px' }}
          >
            X:
          </label>
          <input
            className="common-input-style nodrag"
            id="xInput"
            type="number"
            value={x}
            onChange={e => {
              const x = toBoundedUInt(e.target.value, maxImageWidth.current);
              const width = toBoundedUInt(
                value.width,
                maxImageWidth.current ? maxImageWidth.current - x : null
              );
              setValue(forWhom, {
                ...value,
                x,
                width
              });
            }}
            style={{ width: '80%' }}
          />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label
            htmlFor="yInput"
            style={{ marginRight: '4px', fontSize: '13px' }}
          >
            Y:
          </label>
          <input
            className="common-input-style nodrag"
            id="yInput"
            type="number"
            value={y}
            onChange={e => {
              const y = toBoundedUInt(e.target.value, maxImageHeight.current);
              const height = toBoundedUInt(
                value.height,
                maxImageHeight.current ? maxImageHeight.current - y : null
              );
              setValue(forWhom, {
                ...value,
                y,
                height
              });
            }}
            style={{ width: '80%' }}
          />
        </div>
      </div>

      <div className="input-row" style={{ display: 'flex', gap: '8px' }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label
            htmlFor="widthInput"
            style={{ marginRight: '4px', fontSize: '13px' }}
          >
            Width:
          </label>
          <input
            className="common-input-style nodrag"
            id="widthInput"
            type="number"
            value={width}
            onChange={e => {
              setValue(forWhom, {
                ...value,
                width: toBoundedUInt(
                  e.target.value,
                  maxImageWidth.current ? maxImageWidth.current - value.x : null
                )
              });
            }}
            style={{ width: '80%' }}
          />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label
            htmlFor="heightInput"
            style={{ marginRight: '4px', fontSize: '13px' }}
          >
            Height:
          </label>
          <input
            className="common-input-style nodrag"
            id="heightInput"
            type="number"
            value={height}
            onChange={e => {
              setValue(forWhom, {
                ...value,
                height: toBoundedUInt(
                  e.target.value,
                  maxImageHeight.current
                    ? maxImageHeight.current - value.y
                    : null
                )
              });
            }}
            style={{ width: '80%' }}
          />
        </div>
      </div>
      <ImageCropper
        forWhom={forWhom}
        value={value}
        setValue={setValue}
        editorContext={editorContext}
        image={image}
      />
    </div>
  );
}
