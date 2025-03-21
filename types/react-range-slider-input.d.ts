declare module 'react-range-slider-input' {
    interface RangeSliderProps {
      value?: number[];
      min?: number;
      max?: number;
      step?: number | 'any';
      onInput?: (value: number[]) => void;
      onChange?: (value: number[]) => void;
      style?: React.CSSProperties;
      className?: string;
      [key: string]: any;
    }
  
    const RangeSlider: React.FC<RangeSliderProps>;
    export default RangeSlider;
  }
  