import { useEffect, useState, type CSSProperties } from 'react';
import type EditorContext from '../../EditorContext';
import { CloseIcon, RefreshIcon } from '../../Style';

export interface INotReadyNodePanelProps {
  // Node key and inputs that are not ready for execution
  notReadyNodes: Record<string, string[]>;
  editorContext?: EditorContext;
  style?: CSSProperties;
}

interface IIconButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  style?: CSSProperties;
}

function IconButton({
  onClick,
  title,
  children,
  style
}: IIconButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s',
        ...style
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  );
}

export default function NotReadyNodePanel({
  editorContext,
  notReadyNodes
}: INotReadyNodePanelProps): JSX.Element {
  const [notReady, setNotReady] =
    useState<Record<string, string[]>>(notReadyNodes);

  const handleClose = (): void => {
    editorContext?.action('panels').close('notReadyNodePanel');
  };

  const handleRefresh = (): void => {
    const notReadyNodes = editorContext
      ?.action('graph')
      .findNotReadyNodesForExecute();
    setNotReady(notReadyNodes);
  };

  const handleClick = (nodeID: string): void => {
    editorContext?.action('scene').focusOn(nodeID);
  };

  useEffect(() => {
    setNotReady(notReadyNodes);
  }, [notReadyNodes]);

  useEffect(() => {
    editorContext?.addGraphChangeListener(handleRefresh);
  }, []);

  const renderNodeDetails = (nodeID: string, inputs: string[]): JSX.Element => {
    return (
      <div
        key={nodeID}
        style={{
          marginBottom: '2px',
          borderBottom: '1px solid #e0e0e0',
          paddingBottom: '5px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start'
          }}
        >
          <strong
            onClick={() => {
              handleClick(nodeID);
            }}
            style={{
              cursor: 'pointer',
              color: '#D32F2F',
              transition: 'color 0.3s',
              fontSize: '14px',
              marginBottom: '4px'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#8a0303')}
            onMouseLeave={e => (e.currentTarget.style.color = '#D32F2F')}
          >
            {editorContext?.action('graph').getNodeByID(nodeID).data
              .displayLabel ?? nodeID}
          </strong>
          <span
            style={{
              color: 'black',
              fontSize: '12px',
              wordWrap: 'break-word'
            }}
          >
            <strong>{inputs.join(', ')}</strong>
            {` ${inputs.length > 1 ? 'are' : 'is'} not connected or specified.`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: '8px 12px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        maxWidth: '300px',
        maxHeight: '200px',
        width: '100%',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
        position: 'absolute',
        top: '55px',
        right: '10px',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '24px',
          marginBottom: '4px',
          flexShrink: 0
        }}
      >
        <IconButton
          onClick={handleRefresh}
          title="Refresh"
          style={{
            position: 'absolute',
            top: '-6px',
            left: '-10px'
          }}
        >
          <RefreshIcon />
        </IconButton>
        <IconButton
          onClick={handleClose}
          title="Close"
          style={{
            position: 'absolute',
            top: '-6px',
            right: '-10px'
          }}
        >
          <CloseIcon />
        </IconButton>
      </div>
      <div
        style={{
          overflowY: 'auto',
          marginBottom: '8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--vpl-scrollbar-color)',
          flexGrow: 1
        }}
      >
        {Object.keys(notReady).length > 0 ? (
          Object.entries(notReady).map(([nodeID, inputs]) =>
            renderNodeDetails(nodeID, inputs)
          )
        ) : (
          <div
            style={{
              color: 'black',
              fontFamily: 'Arial, sans-serif',
              fontSize: '13px',
              textAlign: 'center'
            }}
          >
            All nodes are ready for execution.
          </div>
        )}
      </div>
    </div>
  );
}
