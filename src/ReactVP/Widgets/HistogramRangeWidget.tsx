/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useRef, useState, useEffect, useCallback } from 'react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';

import { type WidgetProps } from './Widget';

interface IHistogramRangeWidgetProps extends WidgetProps {
  value: {
    upper: number;
    lower: number;
  };
  histogram?: {
    type: 'rgb' | 'grayscale';
    data: number[][] | number[];
  };
  min?: number;
  max?: number;
  step?: number;
}

export default function HistogramRangeWidget({
  value,
  histogram,
  setValue,
  forWhom,
  min = 0,
  max = 1,
  step = 0.01
}: IHistogramRangeWidgetProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lowerInput, setLowerInput] = useState(value.lower.toFixed(2));
  const [upperInput, setUpperInput] = useState(value.upper.toFixed(2));

  useEffect(() => {
    if (!histogram && setValue) {
      setValue(forWhom, {
        ...value,
        histogram: {
          type: 'grayscale',
          data: []
        }
      });
    }
  }, [histogram, setValue, forWhom, value]);

  const drawHistogram = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      opacity: 'background' | 'overlay' = 'background'
    ) => {
      if (histogram?.type === 'rgb') {
        const channels = histogram.data as number[][];
        const colors = channels.map(
          (_, i) =>
            `rgba(${i === 0 ? 255 : 0}, ${i === 1 ? 255 : 0}, ${i === 2 ? 255 : 0}, ${opacity === 'background' ? 0.3 : 0.5})`
        );

        channels.forEach((channel, channelIndex) => {
          ctx.fillStyle = colors[channelIndex];
          channel.forEach((val, i) => {
            const x = (i / 255) * width;
            const h = val * height;
            const isInRange =
              x >= value.lower * width && x <= value.upper * width;
            if (opacity === 'background' || isInRange) {
              ctx.fillRect(x, height - h, width / 255, h);
            }
          });
        });
      } else {
        const grayData = histogram?.data as number[];
        ctx.fillStyle =
          opacity === 'background'
            ? 'rgba(128, 128, 128, 0.3)'
            : 'rgba(64, 128, 255, 0.5)';

        grayData.forEach((val, i) => {
          const x = (i / 255) * width;
          const h = val * height;
          const isInRange =
            x >= value.lower * width && x <= value.upper * width;
          if (opacity === 'background' || isInRange) {
            ctx.fillRect(x, height - h, width / 255, h);
          }
        });
      }
    },
    [histogram, value]
  );

  // Render histogram and range overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !histogram?.data ||
      (Array.isArray(histogram.data) && histogram.data.length === 0)
    ) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);
    drawHistogram(ctx, width, height, 'background');
    drawHistogram(ctx, width, height, 'overlay');
  }, [histogram, value, drawHistogram]);

  const stopPropagation = (
    e: React.MouseEvent | React.TouchEvent | React.PointerEvent
  ) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const handleInputChange = (type: 'lower' | 'upper', inputValue: string) => {
    if (type === 'lower') {
      setLowerInput(inputValue);
    } else {
      setUpperInput(inputValue);
    }
  };

  const handleInputBlur = (type: 'lower' | 'upper') => {
    const inputValue = type === 'lower' ? lowerInput : upperInput;
    const newValue = parseFloat(inputValue);

    if (isNaN(newValue)) {
      if (type === 'lower') {
        setLowerInput(value.lower.toFixed(2));
      } else {
        setUpperInput(value.upper.toFixed(2));
      }
      return;
    }

    if (type === 'lower' && newValue <= value.upper && setValue) {
      setValue(forWhom, { ...value, lower: newValue });
      setLowerInput(newValue.toFixed(2));
    } else if (type === 'upper' && newValue >= value.lower && setValue) {
      setValue(forWhom, {
        ...value,
        upper: newValue
      });
      setUpperInput(newValue.toFixed(2));
    } else {
      if (type === 'lower') {
        setLowerInput(value.lower.toFixed(2));
      } else {
        setUpperInput(value.upper.toFixed(2));
      }
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: 'lower' | 'upper'
  ) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleInputBlur(type);
      e.currentTarget.blur();
    }
  };

  useEffect(() => {
    if (document.activeElement?.tagName !== 'INPUT') {
      setLowerInput(value.lower.toFixed(2));
      setUpperInput(value.upper.toFixed(2));
    }
  }, [value.lower, value.upper]);

  const handleRangeChange = (newValue: number[]) => {
    if (!setValue || newValue.length !== 2) {
      return;
    }
    setValue(forWhom, {
      ...value,
      lower: newValue[0],
      upper: newValue[1]
    });
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <div
        className="histogram-widget"
        style={{ position: 'relative', width: '100%', height: '100px' }}
        onMouseDown={stopPropagation}
        onMouseMove={stopPropagation}
        onMouseUp={stopPropagation}
        onPointerDown={stopPropagation}
        onPointerMove={stopPropagation}
        onPointerUp={stopPropagation}
        onTouchStart={stopPropagation}
        onTouchMove={stopPropagation}
        onTouchEnd={stopPropagation}
        onDragStart={stopPropagation}
      >
        <canvas
          ref={canvasRef}
          width={200}
          height={100}
          style={{
            width: '100%',
            height: '100px',
            backgroundColor: 'var(--vpl-blue-gray-6)',
            borderRadius: 'var(--vpl-border-radius)',
            marginBottom: '8px'
          }}
        />

        <div
          id="range-slider"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <RangeSlider
            value={[value.lower, value.upper]}
            min={min}
            max={max}
            step={step}
            onInput={handleRangeChange}
            style={{
              height: '100%',
              width: '100%'
            }}
          />
        </div>
        <div className="histogram-values">
          <input
            type="text"
            className="value-mark"
            style={{
              left: `${value.lower * 100}%`,
              transform: 'translateX(-50%)'
            }}
            value={lowerInput}
            onChange={e => {
              handleInputChange('lower', e.target.value);
            }}
            onBlur={() => {
              handleInputBlur('lower');
            }}
            onKeyDown={e => {
              handleKeyDown(e, 'lower');
            }}
            onClick={e => {
              e.stopPropagation();
            }}
            onFocus={e => {
              e.target.select();
            }}
          />
          <input
            type="text"
            className="value-mark"
            style={{
              left: `${value.upper * 100}%`,
              transform: 'translateX(-50%)'
            }}
            value={upperInput}
            onChange={e => {
              handleInputChange('upper', e.target.value);
            }}
            onBlur={() => {
              handleInputBlur('upper');
            }}
            onKeyDown={e => {
              handleKeyDown(e, 'upper');
            }}
            onClick={e => {
              e.stopPropagation();
            }}
            onFocus={e => {
              e.target.select();
            }}
          />
        </div>
      </div>
    </div>
  );
}
