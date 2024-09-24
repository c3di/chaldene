import React, { useEffect, useRef, useState } from 'react';
import { type WidgetProps } from './Widget';
import { FileIcon, FolderIcon } from '../Style';

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
      className="nodrag common-input-style widget"
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
      className="nodrag widget"
      type="checkbox"
      checked={value}
      onChange={e => {
        setValue?.(forWhom, e.target.checked);
      }}
    />
  );
}

interface INumberProps extends WidgetProps {
  min?: number;
  max?: number;
  step?: number;
}

export function NumericInput({
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
  const [localValue, setLocalValue] = useState(value);
  const percentage = ((localValue - min) / (max - min)) * 100;
  return (
    <div className="slider-container widget">
      <input
        className="nodrag"
        type="range"
        value={localValue}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          setLocalValue(parseFloat(e.target.value));
        }}
        onMouseUp={e => {
          setValue?.(forWhom, localValue);
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
        {localValue}
      </div>
    </div>
  );
}

export function NumberInput({
  forWhom,
  value,
  setValue,
  defaultValue = 0,
  min = -Infinity,
  max = Infinity,
  step
}: INumberProps): JSX.Element {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimeout = useRef<number | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const inputValue = parseFloat(e.target.value);
    const newValue = Number.isNaN(inputValue) ? defaultValue : inputValue;

    setLocalValue(newValue > max ? max : newValue < min ? min : newValue);

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
      className="nodrag common-input-style widget"
      type="number"
      value={localValue}
      min={min}
      max={max}
      step={step}
      onChange={handleInputChange}
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
      className="nodrag common-input-style widget"
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
  const isSelectFolder = extensions && extensions.length === 0;
  return (
    <div className="file-input-container widget">
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
          {isSelectFolder ? <FolderIcon /> : <FileIcon />}
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
