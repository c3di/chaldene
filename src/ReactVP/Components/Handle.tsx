import { Handle as RCHandle, Position } from '@xyflow/react';
import { type IHandleIdentifier, type IHandle } from '../Type';
import useWidget from './UseWidget';
import type EditorContext from '../EditorContext';

export interface IHandleProps extends IHandle {
  identifier: IHandleIdentifier;
  editorContext?: EditorContext;
  nodeDimensions?: { width: number; height?: number };
}

export function InputHandle({
  id,
  type,
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

  const showLabel = widget?.type !== 'ImageCropper';
  const isImageGallery = widget?.type === 'ImageGallery';

  return (
    <div
      className={`flex-container ${isImageGallery ? 'image-gallery-container' : ''}`}
      title={
        type ? `type: ${type}. ` : '' + description ? `${description}` : ''
      }
    >
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
      {showLabel && (
        <span
          className={`label ${isImageGallery ? 'image-gallery-label' : ''}`}
        >
          {displayLabel}
        </span>
      )}
      {Widget && (
        <div
          className={`widget-container ${
            !showLabel ? 'widget-container-no-label' : ''
          }`}
          style={{
            width: isImageGallery || showLabel ? '100%' : 'calc(100% - 25px)'
          }}
        >
          {Widget}
        </div>
      )}
    </div>
  );
}

export function OutputHandle({
  id,
  type,
  identifier,
  displayLabel,
  description,
  widget,
  editorContext,
  connections,
  nodeDimensions
}: IHandleProps): JSX.Element {
  const Widget = useWidget(
    'outputs',
    widget,
    widget?.value,
    editorContext,
    identifier,
    displayLabel,
    nodeDimensions
  );

  const showLabel = widget?.type !== 'ImageViewer';

  return (
    <div
      className="flex-container"
      style={{
        justifyContent: 'flex-end'
      }}
      title={
        type ? `type: ${type}. ` : '' + description ? `${description}` : ''
      }
    >
      {Widget && (
        <div
          className={`widget-container ${
            !showLabel ? 'widget-container-no-label' : ''
          }`}
          style={{
            width: showLabel ? '100%' : 'calc(100% - 25px)'
          }}
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
