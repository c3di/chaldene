import { useEffect, useRef } from 'react';
import {
  Handle as RCHandle,
  Position,
  useUpdateNodeInternals
} from '@xyflow/react';
import { type IHandleIdentifier, type IHandle } from '../Type';
import useWidget from './UseWidget';
import type EditorContext from '../EditorContext';

export interface IHandleProps extends IHandle {
  identifier: IHandleIdentifier;
  editorContext?: EditorContext;
}

export function InputHandle({
  id,
  identifier,
  displayLabel,
  description,
  widget,
  defaultValue,
  editorContext,
  connections
}: IHandleProps): JSX.Element {
  const Widget = useWidget(
    'inputs',
    widget,
    defaultValue,
    editorContext,
    identifier
  );

  const updateNodeInternals = useUpdateNodeInternals();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      updateNodeInternals(id);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [id, updateNodeInternals]);

  return (
    <div ref={containerRef} className="flex-container" title={description}>
      {!Widget && (
        <div className="handle-container-input">
          <RCHandle
            id={id}
            type="target"
            position={Position.Left}
            isConnectable={true}
            className={
              connections && connections > 0
                ? 'handle-style connected'
                : 'handle-style disconnected'
            }
          />
        </div>
      )}
      <span
        className="label"
        style={{
          marginRight: '12px'
        }}
      >
        {displayLabel}
      </span>
      {Widget ?? null}
    </div>
  );
}

export function OutputHandle({
  id,
  identifier,
  displayLabel,
  description,
  widget,
  editorContext,
  connections,
  type
}: IHandleProps): JSX.Element {
  const Widget = useWidget(
    'outputs',
    widget,
    widget?.value,
    editorContext,
    identifier
  );

  const showLabel = !(type === 'image' && widget?.type === 'ImageViewer');
  const updateNodeInternals = useUpdateNodeInternals();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      updateNodeInternals(id);
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [id, updateNodeInternals]);

  return (
    <div
      ref={containerRef}
      className="flex-container"
      style={{ justifyContent: 'flex-end' }}
      title={description}
    >
      {Widget && (
        <div
          className={`widget-container ${
            !showLabel ? 'widget-container-no-label' : ''
          }`}
        >
          {Widget}
        </div>
      )}
      {showLabel && (
        <span
          className="label"
          style={{
            marginRight: '8px'
          }}
        >
          {displayLabel}
        </span>
      )}
      <div className="handle-container-output">
        <RCHandle
          className={
            connections && connections > 0
              ? 'handle-style connected'
              : 'handle-style disconnected'
          }
          id={id}
          type="source"
          position={Position.Right}
          isConnectable={true}
        />
      </div>
    </div>
  );
}
