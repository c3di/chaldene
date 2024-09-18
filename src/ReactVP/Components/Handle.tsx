import { Handle as RCHandle, Position } from '@xyflow/react';
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

  return (
    <div className="flex-container" title={description}>
      {!Widget && (
        <div className="handle-container">
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
          marginRight: '12px',
          marginLeft: '2px'
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
  connections
}: IHandleProps): JSX.Element {
  const Widget = useWidget(
    'outputs',
    widget,
    widget?.value,
    editorContext,
    identifier
  );
  return (
    <div
      className="flex-container"
      style={{ justifyContent: 'flex-end' }}
      title={description}
    >
      {Widget && (
        <div className="widget-container" style={{ marginRight: 'auto' }}>
          {Widget}
        </div>
      )}
      <span
        className="label"
        style={{
          marginRight: '2px'
        }}
      >
        {displayLabel}
      </span>
      <div className="handle-container" style={{ right: '0px', left: 'auto' }}>
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
