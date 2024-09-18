import { type NodeProps as RcNodeProps } from '@xyflow/react';
import { type IHandle, type Node as nodeType } from '../Type';
import { OutputHandle, InputHandle } from './Handle';

export type NodeProps = RcNodeProps<nodeType>;

export default function ComputeNode({
  id,
  data,
  selected
}: NodeProps): JSX.Element {
  const { displayLabel, description, inputs, outputs, editorContext } = data;

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
          color: '#333',
          padding: '10px 14px 3px 14px',
          fontSize: '16px',
          fontFamily: 'var(--vpl-ui-font-header)',
          fontWeight: 'bold',
          borderBottom: '1.5px solid var(--vpl-blue-1)'
        }}
      >
        {displayLabel}
      </div>
      <div className="node__body" style={{ padding: '15px 3px 12px 12px' }}>
        <div className="vp-node-handles-container">{inputHandles}</div>
        <div className="vp-node-handles-container">{outputHandles}</div>
      </div>
    </div>
  );
}
