import { type NodeProps as RcNodeProps } from '@xyflow/react';
import { type IHandle, type Node as nodeType } from '../Type';
import { OutputHandle, InputHandle } from './Handle';
import { useState } from 'react';
import { NumberInput } from '../Widgets/Input';

export type NodeProps = RcNodeProps<nodeType>;

export default function ComputeNode({
  id,
  data,
  selected
}: NodeProps): JSX.Element {
  const {
    displayLabel,
    description,
    inputs,
    outputs,
    editorContext,
    repeatable
  } = data;
  const [repeatCount, setRepeatCount] = useState(1);

  const _inputs = inputs ?? [];
  const inputHandles = _inputs.map((handle: IHandle) => (
    <InputHandle
      {...handle}
      key={handle.id}
      identifier={{ nodeID: id, id: handle.id, type: 'target' }}
      editorContext={editorContext}
    />
  ));

  const _outputs = outputs ?? [];
  const outputHandles = _outputs.map((handle: IHandle) => (
    <OutputHandle
      {...handle}
      key={handle.id}
      identifier={{ nodeID: id, id: handle.id, type: 'source' }}
      editorContext={editorContext}
    />
  ));

  return (
    <div
      title={description}
      className="vp-node-container"
      style={{
        position: 'relative',
        borderRadius: '6px',
        overflow: 'visible',
        backgroundColor: 'white',
        border: ` ${
          selected
            ? '1.5px solid var(--vpl-blue-1)'
            : '1px solid var(--vpl-border-color1)'
        }`,
        width: '300px',
        transition: 'border-color 0.1s ease-in-out'
      }}
    >
      <div
        className="node__header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#333',
          padding: '10px 5px 3px 14px',
          fontSize: '16px',
          fontFamily: 'var(--vpl-ui-font-header)',
          fontWeight: 'bold',
          borderBottom: '1.5px solid var(--vpl-blue-1)'
        }}
      >
        <span>{displayLabel}</span>
        {repeatable && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 512 512"
              style={{
                margin: '0 6px',
                fill: 'var(--vpl-blue-1)',
                stroke: 'var(--vpl-blue-1)',
                strokeWidth: '24px'
              }}
            >
              <path d="m393.46 35.86h-274.92a118.52 118.52 0 0 0 -118.38 118.38v125a118.52 118.52 0 0 0 118.38 118.33h39.63a24 24 0 1 0 0-48h-39.63a70.47 70.47 0 0 1 -70.38-70.38v-124.95a70.47 70.47 0 0 1 70.38-70.38h274.92a70.47 70.47 0 0 1 70.38 70.38v125a70.47 70.47 0 0 1 -70.38 70.38h-79.52l37.6-37.6a24 24 0 1 0 -33.94-34.02l-78.6 78.6a24 24 0 0 0 0 33.94l78.57 78.57a24 24 0 0 0 33.94-33.94l-37.6-37.6h79.52a118.52 118.52 0 0 0 118.41-118.38v-124.95a118.52 118.52 0 0 0 -118.38-118.38z" />
            </svg>
            <NumberInput
              forWhom={undefined}
              value={repeatCount}
              setValue={(_, value) => setRepeatCount(value)}
              min={1}
              defaultValue={1}
              style={{ width: '20px' }}
            />
          </div>
        )}
      </div>
      <div className="node__body" style={{ padding: '15px 3px 2px 12px' }}>
        <div className="vp-node-handles-container">{inputHandles}</div>
        <div className="vp-node-handles-container">{outputHandles}</div>
      </div>
    </div>
  );
}
