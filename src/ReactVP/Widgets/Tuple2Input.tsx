import { type WidgetProps } from './Widget';
import { type Identifier, type Tuple2 } from '../Type';
import { NumberInput } from './Input';

interface IVector2Props extends WidgetProps {
  value: Tuple2;
  setValue: (identifier?: Identifier, value?: Tuple2) => void;
}

export default function Tuple2Input({
  forWhom,
  value,
  setValue
}: IVector2Props): JSX.Element {
  const [x, y] = value;

  return (
    <div
      className="bounding-box-container"
      style={{ display: 'flex', flexDirection: 'row', gap: '3px' }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
        <label
          htmlFor="xInput"
          style={{ marginRight: '4px', fontSize: '13px' }}
        >
          x:
        </label>
        <NumberInput
          id="xInput"
          forWhom={forWhom}
          value={x}
          min={0}
          defaultValue={1.0}
          setValue={(forwhom, value) => {
            setValue(forWhom, [value, y]);
          }}
        />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
        <label
          htmlFor="yInput"
          style={{ marginRight: '4px', fontSize: '13px' }}
        >
          y:
        </label>
        <NumberInput
          id="yInput"
          forWhom={forWhom}
          value={y}
          min={0}
          defaultValue={1.0}
          setValue={(forwhom, value) => {
            setValue(forWhom, [x, value]);
          }}
        />
      </div>
    </div>
  );
}
