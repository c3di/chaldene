/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useRef, useState, useEffect } from 'react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';

import { type WidgetProps } from './Widget';

interface IHistogramRangeWidgetProps extends WidgetProps {
  value: {
    upper: number;
    lower: number;
  };
  widgetValue?: {
    histogram?: {
      type: 'rgb' | 'grayscale';
      data: number[][] | number[];
    };
  };
  min?: number;
  max?: number;
  step?: number;
}

export default function HistogramRangeWidget({
  value,
  widgetValue,
  setValue,
  forWhom,
  min = 0,
  max = 1,
  step = 0.01
}: IHistogramRangeWidgetProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [histogram, setHistogram] = useState<{
    type: 'rgb' | 'grayscale';
    data: number[][] | number[];
  }>({ type: 'rgb', data: [] });
  const [lowerInput, setLowerInput] = useState(value.lower.toFixed(2));
  const [upperInput, setUpperInput] = useState(value.upper.toFixed(2));

  useEffect(() => {
    const histogramData = widgetValue?.histogram;

    if (!histogramData && setValue) {
      console.log('[HistogramRange] Initializing empty histogram');
      setValue(forWhom, {
        ...value,
        histogram: {
          type: 'grayscale',
          data: []
        }
      });
    } else if (histogramData) {
      console.log('[HistogramRange] Histogram updated:', {
        type: histogramData.type,
        dataLength: Array.isArray(histogramData.data)
          ? histogramData.data.length
          : 0,
        sample: Array.isArray(histogramData.data)
          ? histogramData.data.slice(0, 3)
          : []
      });
      setHistogram(histogramData);
    }
  }, [value, widgetValue, setValue, forWhom]);

  useEffect(() => {
    setLowerInput(value.lower.toFixed(2));
    setUpperInput(value.upper.toFixed(2));
  }, [value.lower, value.upper]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !histogram?.data ||
      (Array.isArray(histogram.data) && histogram.data.length === 0)
    ) {
      console.log('[HistogramRange] Skipping render - invalid data:', {
        hasCanvas: !!canvas,
        hasHistogram: !!histogram,
        hasData: !!histogram?.data,
        dataLength: histogram?.data
          ? Array.isArray(histogram.data)
            ? histogram.data.length
            : 0
          : 0
      });
      return;
    }

    console.log('[HistogramRange] Rendering histogram:', {
      type: histogram.type,
      width: canvas.width,
      height: canvas.height,
      range: [value.lower, value.upper]
    });

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[HistogramRange] Failed to get canvas context');
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (histogram.type === 'rgb') {
      const channels = histogram.data as number[][];
      const colors = [
        'rgba(255, 0, 0, 0.3)',
        'rgba(0, 255, 0, 0.3)',
        'rgba(0, 0, 255, 0.3)'
      ];

      channels.forEach((channel, channelIndex) => {
        ctx.fillStyle = colors[channelIndex];
        channel.forEach((value, i) => {
          const x = (i / 255) * width;
          const h = value * height;
          ctx.fillRect(x, height - h, width / 255, h);
        });
      });
    } else {
      const grayData = histogram.data as number[];
      ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
      grayData.forEach((value, i) => {
        const x = (i / 255) * width;
        const h = value * height;
        ctx.fillRect(x, height - h, width / 255, h);
      });
    }

    // Draw selected range
    const lowerX = value.lower * width;
    const upperX = value.upper * width;

    if (histogram.type === 'rgb') {
      const channels = histogram.data as number[][];
      const colors = [
        'rgba(255, 0, 0, 0.5)',
        'rgba(0, 255, 0, 0.5)',
        'rgba(0, 0, 255, 0.5)'
      ];

      channels.forEach((channel, channelIndex) => {
        ctx.fillStyle = colors[channelIndex];
        channel.forEach((value, i) => {
          const x = (i / 255) * width;
          if (x >= lowerX && x <= upperX) {
            const h = value * height;
            ctx.fillRect(x, height - h, width / 255, h);
          }
        });
      });
    } else {
      const grayData = histogram.data as number[];
      ctx.fillStyle = 'rgba(64, 128, 255, 0.5)';
      grayData.forEach((value, i) => {
        const x = (i / 255) * width;
        if (x >= lowerX && x <= upperX) {
          const h = value * height;
          ctx.fillRect(x, height - h, width / 255, h);
        }
      });
    }
  }, [histogram, value.lower, value.upper]);

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
