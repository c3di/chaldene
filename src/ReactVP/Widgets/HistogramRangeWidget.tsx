/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { useRef, useState, useEffect } from 'react';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';

import { type WidgetProps } from './Widget';

interface IHistogramRangeWidgetProps extends WidgetProps {
  value: { upper: number; lower: number };
  image?: {
    imageUrl: string;
    dimensions?: {
      width: number;
      height: number;
    };
    histogram?: number[];
  };
  min?: number;
  max?: number;
}

const generateDummyHistogram = (): number[] => {
  const histogram = new Array(256).fill(0);

  // Simulate RGB peaks at different positions
  const peaks = [
    { pos: 64, strength: 0.8 }, // R peak
    { pos: 128, strength: 1.0 }, // G peak
    { pos: 192, strength: 0.6 }, // B peak
  ];

  for (let i = 0; i < 256; i++) {
    let value = 0;
    peaks.forEach((peak) => {
      value += peak.strength * Math.exp(-Math.pow(i - peak.pos, 2) / 1000);
    });
    value += Math.random() * 0.1;
    histogram[i] = value;
  }

  // Normalize values to be between 0 and 1
  const max = Math.max(...histogram);
  return histogram.map((v) => v / max);
};

export default function HistogramRangeWidget({
  value,
  setValue,
  forWhom,
  image,
  min = 0,
  max = 1,
}: IHistogramRangeWidgetProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [histogram, setHistogram] = useState<number[]>([]);
  const [lowerInput, setLowerInput] = useState(value.lower.toFixed(2));
  const [upperInput, setUpperInput] = useState(value.upper.toFixed(2));

  useEffect(() => {
    if (image?.histogram) {
      setHistogram(image.histogram);
    } else {
      setHistogram(generateDummyHistogram());
    }
  }, [image?.histogram]);

  useEffect(() => {
    setLowerInput(value.lower.toFixed(2));
    setUpperInput(value.upper.toFixed(2));
  }, [value.lower, value.upper]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || histogram.length === 0) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
    histogram.forEach((value, i) => {
      const x = (i / 255) * width;
      const h = value * height;
      ctx.fillRect(x, height - h, width / 255, h);
    });

    ctx.fillStyle = 'rgba(64, 128, 255, 0.3)';
    const lowerX = value.lower * width;
    const upperX = value.upper * width;
    histogram.forEach((value, i) => {
      const x = (i / 255) * width;
      if (x >= lowerX && x <= upperX) {
        const h = value * height;
        ctx.fillRect(x, height - h, width / 255, h);
      }
    });
  }, [histogram, value]);

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
      setValue(forWhom, { ...value, upper: newValue });
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
            marginBottom: '8px',
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
            step={0.01}
            onInput={(newValue: number[]) => {
              if (!setValue || newValue.length !== 2) return;
              setValue(forWhom, {
                lower: newValue[0],
                upper: newValue[1],
              });
            }}
            style={{
              height: '100%',
              width: '100%',
            }}
          />
        </div>
        <div className="histogram-values">
          <input
            type="text"
            className="value-mark"
            style={{
              left: `${value.lower * 100}%`,
              transform: 'translateX(-50%)',
            }}
            value={lowerInput}
            onChange={(e) => {
              handleInputChange('lower', e.target.value);
            }}
            onBlur={() => {
              handleInputBlur('lower');
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, 'lower');
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onFocus={(e) => {
              e.target.select();
            }}
          />
          <input
            type="text"
            className="value-mark"
            style={{
              left: `${value.upper * 100}%`,
              transform: 'translateX(-50%)',
            }}
            value={upperInput}
            onChange={(e) => {
              handleInputChange('upper', e.target.value);
            }}
            onBlur={() => {
              handleInputBlur('upper');
            }}
            onKeyDown={(e) => {
              handleKeyDown(e, 'upper');
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            onFocus={(e) => {
              e.target.select();
            }}
          />
        </div>
      </div>
    </div>
  );
}
