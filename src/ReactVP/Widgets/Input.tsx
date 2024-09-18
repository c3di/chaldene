import React, { useEffect, useRef, useState } from 'react';
import { type WidgetProps } from './Widget';
import { FaFile } from 'react-icons/fa';

export function Text({
  forWhom,
  value,
  setValue,
  placeholder
}: WidgetProps): JSX.Element {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimeout = useRef<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = window.setTimeout(() => {
      setValue?.(forWhom, newValue);
    }, 400);
  };

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    setLocalValue(value);
  }, [value]);

  return (
    <input
      className="nodrag common-input-style"
      type="text"
      value={localValue}
      onChange={handleInputChange}
      placeholder={placeholder ?? 'Enter Text'}
    />
  );
}

export function Boolean({
  forWhom,
  value,
  setValue
}: WidgetProps): JSX.Element {
  return (
    <input
      className="nodrag"
      type="checkbox"
      checked={value}
      onChange={e => {
        setValue?.(forWhom, e.target.checked);
      }}
    />
  );
}

interface INumberProps extends WidgetProps {
  min: number;
  max: number;
  step: number;
}

export function Number({
  forWhom,
  value,
  setValue,
  min,
  max,
  step
}: INumberProps): JSX.Element {
  if (min !== undefined && max !== undefined) {
    return (
      <Slider
        forWhom={forWhom}
        value={value}
        setValue={setValue}
        min={min}
        max={max}
        step={step ?? (max - min) / 10}
      />
    );
  }
  return (
    <NumberInput
      forWhom={forWhom}
      value={value}
      setValue={setValue}
      min={min}
      max={max}
      step={step}
    />
  );
}

export function Slider({
  forWhom,
  value,
  setValue,
  min = 0,
  max = 100,
  step = 1
}: INumberProps): JSX.Element {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-container">
      <input
        className="nodrag"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          setValue?.(forWhom, parseFloat(e.target.value));
        }}
        style={{
          background: `linear-gradient(to right, var(--vpl-blue-3) ${percentage}%, var(--vpl-blue-gray-4) ${percentage}%)`
        }}
      />
      <div
        className="slider-value"
        style={{
          position: 'absolute',
          top: '50%',
          right: '30px',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          cursor: 'default',
          pointerEvents: 'none'
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function NumberInput({
  forWhom,
  value,
  setValue,
  min,
  max,
  step
}: INumberProps): JSX.Element {
  return (
    <input
      className="nodrag common-input-style"
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => {
        const v = parseFloat(e.target.value);
        setValue?.(forWhom, v > max ? max : v < min ? min : v);
      }}
    />
  );
}

export interface IDropdownProps extends WidgetProps {
  options: string[];
}

export function Dropdown({
  forWhom,
  value,
  setValue,
  options
}: IDropdownProps): JSX.Element {
  return (
    <select
      className="nodrag common-input-style"
      value={value}
      onChange={e => {
        setValue?.(forWhom, e.target.value);
      }}
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function FileInputFromServer({
  forWhom,
  value,
  setValue,
  editorContext,
  extensions
}: WidgetProps): JSX.Element {
  return (
    <div className="file-input-container">
      {editorContext?.parentContext?.openFileDialog && (
        <button
          className="file-input-button"
          title="Open file dialog"
          onClick={() => {
            editorContext?.parentContext
              ?.openFileDialog(extensions)
              .then((path: string) => {
                if (path !== null) {
                  setValue?.(forWhom, path);
                }
              });
          }}
        >
          <FaFile size={12} />
        </button>
      )}
      <Text
        forWhom={forWhom}
        value={value}
        placeholder=""
        setValue={setValue}
      />
    </div>
  );
}

export function FileInput({
  forWhom,
  value,
  setValue
}: WidgetProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files ? event.target.files[0] : null;
    if (file) {
      setValue?.(forWhom, file.name);
    }
  };

  const handleClick = (): void => {
    inputRef.current?.click();
  };

  return (
    <div
      className="common-input-style"
      style={{ padding: 0, cursor: 'pointer' }}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".png, .jpg, .jpeg"
        onChange={handleFileChange}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          height: '100%',
          padding: '0 8px'
        }}
      >
        <FaFile size={12} style={{ marginRight: '8px', color: '#718096' }} />
        <span
          style={{
            fontSize: '12px',
            color: '#718096',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {value || 'Click to select an image'}
        </span>
      </div>
    </div>
  );
}
