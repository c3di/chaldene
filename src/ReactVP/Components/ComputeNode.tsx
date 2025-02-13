import { type NodeProps as RcNodeProps, NodeResizer } from '@xyflow/react';
import { type IHandle, type Node as nodeType } from '../Type';
import { OutputHandle, InputHandle } from './Handle';
import { useState, useEffect, useCallback } from 'react';
import { NumberInput } from '../Widgets/Input';

export type NodeProps = RcNodeProps<nodeType>;

const DEFAULT_NODE_WIDTH = 300;
const MIN_NODE_HEIGHT = 230; // 150px for canvas + 80px for padding/header

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
    extraRun
  } = data;

  const [nodeDimensions, setNodeDimensions] = useState({
    width: DEFAULT_NODE_WIDTH,
    height: 0
  });

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
      nodeDimensions={nodeDimensions}
    />
  ));

  useEffect(() => {
    // Update node dimensions when component mounts
    setNodeDimensions({
      width: DEFAULT_NODE_WIDTH,
      height: MIN_NODE_HEIGHT
    });
  }, []);

  const handleNodeResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      const newDimensions = {
        width: params.width,
        height: Math.max(params.height, MIN_NODE_HEIGHT)
      };
      setNodeDimensions(newDimensions);
    },
    []
  );

  // useEffect(() => {
  //   console.log('Node dimensions updated:', {
  //     nodeId: id,
  //     dimensions: nodeDimensions,
  //     timestamp: new Date().toISOString()
  //   });
  // }, [nodeDimensions, id]);

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
        width: nodeDimensions.width,
        minHeight: MIN_NODE_HEIGHT,
        transition: 'border-color 0.1s ease-in-out'
      }}
    >
      {selected && (
        <NodeResizer
          minWidth={DEFAULT_NODE_WIDTH}
          minHeight={MIN_NODE_HEIGHT}
          isVisible={selected}
          lineStyle={{ background: 'var(--vpl-blue-1)' }}
          handleStyle={{ background: 'var(--vpl-blue-1)' }}
          onResize={handleNodeResize}
        />
      )}
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
        {extraRun !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '12px',
                fontFamily: 'var(--jp-ui-font-family)',
                marginRight: '6px',
                fontWeight: 300
              }}
            >
              extra run
            </span>
            <NumberInput
              forWhom={undefined}
              value={data.extraRun}
              setValue={(_, value) => {
                data.extraRun = value;
              }}
              min={0}
              defaultValue={extraRun}
              style={{
                width: '30px',
                height: '16px',
                padding: '0px 1px',
                fontSize: '10px',
                fontWeight: 300
              }}
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
