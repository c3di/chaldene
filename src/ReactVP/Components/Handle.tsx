import { Handle as RCHandle, Position } from '@xyflow/react';
import { type HandleIdentifier, type Handle } from '../Type';
import useWidget from './UseWidget';
import type EditorContext from '../EditorContext';

export interface IHandleProps extends Handle {
  identifier: HandleIdentifier;
  editorContext?: EditorContext;
}

export function InputHandle({
  id,
  identifier,
  displayLabel,
  description,
  widget,
  defaultValue,
  editorContext
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
            className="handle-style"
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
  editorContext
}: IHandleProps): JSX.Element {
  const Widget = useWidget(
    'outputs',
    widget,
    widget?.value,
    editorContext,
    identifier
  );

  const widgetContainerClass =
    widget?.type === 'ImageViewer'
      ? 'widget-container-thin'
      : 'widget-container';
  return (
    <div
      className="flex-container"
      style={{ justifyContent: 'flex-end' }}
      title={description}
    >
      {Widget && <div className={widgetContainerClass}>{Widget}</div>}
      {displayLabel && (
        <span
          className="label"
          style={{
            marginRight: '2px'
          }}
        >
          {displayLabel}
        </span>
      )}
      <div className="handle-container">
        <RCHandle
          className="handle-style"
          id={id}
          type="source"
          position={Position.Right}
          isConnectable={true}
        />
      </div>
    </div>
  );
}
