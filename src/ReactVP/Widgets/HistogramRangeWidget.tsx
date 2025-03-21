/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';

import { type WidgetProps } from './Widget';

interface IHistogramRangeWidgetProps extends WidgetProps {
  value: [number, number];
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
  const debounceTimeout = useRef<number | null>(null);
  const [lowerInput, setLowerInput] = useState(value[0].toFixed(2));
  const [upperInput, setUpperInput] = useState(value[1].toFixed(2));
  const [displayValue, setDisplayValue] = useState<[number, number]>(value);

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
  }, [histogram]);

  const processHistogram = (data: number[], windowSize: number = 5) => {
    //interpolate zeros and collect max value
    let maxVal = 0;
    const interpolated = data.map((val, i) => {
      if (val === 0 && i > 0 && i < data.length - 1) {
        // Simple interpolation between neighboring non-zero values
        val = (data[i - 1] + data[i + 1]) / 2;
      }
      maxVal = Math.max(maxVal, val);
      return val;
    });

    // normalize and smooth
    return interpolated.map((_, idx) => {
      const start = Math.max(0, idx - Math.floor(windowSize / 2));
      const end = Math.min(data.length, idx + Math.floor(windowSize / 2) + 1);
      const window = interpolated.slice(start, end);
      // Normalize while calculating the moving average
      return window.reduce((a, b) => a + b, 0) / window.length / maxVal;
    });
  };

  const drawHistogram = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      opacity: 'background' | 'overlay' = 'background'
    ) => {
      if (histogram?.type === 'rgb') {
        const channels = histogram.data as number[][];
        const colors = useMemo(
          () => ({
            background: 'rgba(128, 128, 128, 0.3)',
            overlay: 'rgba(64, 128, 255, 0.5)',
            rgb: (i: number, opacity: 'background' | 'overlay') =>
              `rgba(${i === 0 ? 255 : 0}, ${i === 1 ? 255 : 0}, ${i === 2 ? 255 : 0}, ${opacity === 'background' ? 0.3 : 0.5})`
          }),
          []
        );

        channels.forEach((channel, channelIndex) => {
          ctx.fillStyle = colors.rgb(channelIndex, opacity);
          channel.forEach((val, i) => {
            const x = (i / 255) * width;
            const h = val * height;
            const isInRange =
              x >= displayValue[0] * width && x <= displayValue[1] * width;
            if (opacity === 'background' || isInRange) {
              ctx.fillRect(x, height - h, width / 255, h);
            }
          });
        });
      } else {
        const grayData = histogram?.data as number[];
        const processedData = processHistogram(grayData);

        ctx.fillStyle =
          opacity === 'background'
            ? 'rgba(128, 128, 128, 0.3)'
            : 'rgba(64, 128, 255, 0.5)';

        processedData.forEach((val, i) => {
          const x = (i / 255) * width;
          const h = val * height;

          const isInRange =
            x >= displayValue[0] * width && x <= displayValue[1] * width;
          if (opacity === 'background' || isInRange) {
            ctx.fillRect(x, height - h, width / 255, h);
          }
        });
      }
    },
    [histogram, displayValue]
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
  }, [histogram, displayValue, drawHistogram]);

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
    const currentValue = type === 'lower' ? displayValue[0] : displayValue[1];
    let newValue = parseFloat(inputValue);

    if (!isNaN(newValue) && newValue === currentValue) {
      const formattedValue = currentValue.toFixed(2);
      if (type === 'lower') {
        setLowerInput(formattedValue);
      } else {
        setUpperInput(formattedValue);
      }
      return;
    }

    if (isNaN(newValue)) {
      if (type === 'lower') {
        setLowerInput(currentValue.toFixed(2));
      } else {
        setUpperInput(currentValue.toFixed(2));
      }
      return;
    }
    newValue = Math.max(min, Math.min(max, newValue));

    if (type === 'lower') {
      if (newValue <= displayValue[1] && setValue) {
        setValue(forWhom, [newValue, displayValue[1]]);
        setLowerInput(newValue.toFixed(2));
      } else {
        setLowerInput(displayValue[0].toFixed(2));
      }
    } else {
      if (newValue >= displayValue[0] && setValue) {
        setValue(forWhom, [displayValue[0], newValue]);
        setUpperInput(newValue.toFixed(2));
      } else {
        setUpperInput(displayValue[1].toFixed(2));
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
      setLowerInput(displayValue[0].toFixed(2));
      setUpperInput(displayValue[1].toFixed(2));
    }
  }, [displayValue[0], displayValue[1]]);

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const clearDebounce = () => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
  };

  const handleRangeChange = useCallback(
    (newValue: number[]) => {
      if (!setValue || newValue.length !== 2) {
        return;
      }

      // Immediately update the display value for real-time rendering
      setDisplayValue([newValue[0], newValue[1]]);

      // Debounce only the parent setValue call
      clearDebounce();
      debounceTimeout.current = window.setTimeout(() => {
        setValue(forWhom, [newValue[0], newValue[1]]);
      }, 400);
    },
    [setValue, forWhom]
  );

  const eventHandlers = {
    onMouseDown: stopPropagation,
    onMouseMove: stopPropagation,
    onMouseUp: stopPropagation,
    onPointerDown: stopPropagation,
    onPointerMove: stopPropagation,
    onPointerUp: stopPropagation,
    onTouchStart: stopPropagation,
    onTouchMove: stopPropagation,
    onTouchEnd: stopPropagation,
    onDragStart: stopPropagation
  };

  const getInputProps = (type: 'lower' | 'upper') => ({
    type: 'text',
    className: 'value-mark nodrag',
    style: {
      left: `${(type === 'lower' ? displayValue[0] : displayValue[1]) * 100}%`,
      transform: 'translateX(-50%)'
    },
    value: type === 'lower' ? lowerInput : upperInput,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      handleInputChange(type, e.target.value),
    onBlur: () => handleInputBlur(type),
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) =>
      handleKeyDown(e, type),
    onClick: (e: React.MouseEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const input = e.currentTarget;
      const clickPosition = input.selectionEnd || 0;
      input.setSelectionRange(clickPosition, clickPosition);
    },
    onDoubleClick: (e: React.MouseEvent<HTMLInputElement>) => {
      e.stopPropagation();
      e.currentTarget.select();
    }
  });

  return (
    <div
      style={{
        marginTop: '30px',
        marginRight: '8px',
        width: '225px',
        flexShrink: 0
      }}
    >
      <div
        className="histogram-widget"
        style={{
          position: 'relative',
          width: '100%',
          height: '70px',
          flex: 1,
          minWidth: 0
        }}
        {...eventHandlers}
      >
        <canvas
          ref={canvasRef}
          width="100%"
          height="70px"
          style={{
            width: '100%',
            height: '70px',
            backgroundColor: 'var(--vpl-blue-gray-6)',
            borderRadius: 'var(--vpl-border-radius)',
            marginBottom: '8px',
            display: 'block'
          }}
        />

        <div
          id="range-slider"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <RangeSlider
            value={[displayValue[0], displayValue[1]]}
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
          <input {...getInputProps('lower')} />
          <input {...getInputProps('upper')} />
        </div>
      </div>
    </div>
  );
}
