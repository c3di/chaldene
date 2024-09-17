import { useEffect, useState, type CSSProperties } from 'react';
import type EditorContext from '../../EditorContext';

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
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
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
            alignItems: 'baseline',
            justifyContent: 'space-between'
          }}
        >
          <strong
            onClick={() => {
              handleClick(nodeID);
            }}
            style={{
              cursor: 'pointer',
              color: 'black',
              transition: 'color 0.3s',
              fontSize: '1.0em',
              marginRight: '10px'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#2c3e50')}
            onMouseLeave={e => (e.currentTarget.style.color = 'black')}
          >
            {editorContext?.action('graph').getNodeByID(nodeID).data
              .displayLabel ?? nodeID}
          </strong>
          <span style={{ color: '#D32F2F', fontSize: '0.7em' }}>
            {`${inputs.join(', ')} ${
              inputs.length > 1 ? 'are' : 'is'
            } not connected or specified.`}
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
        maxWidth: '400px',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        fontFamily: 'Arial, sans-serif',
        position: 'absolute',
        top: '55px',
        right: '10px',
        zIndex: 5
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '24px',
          marginBottom: '4px'
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z"
              fill="#4CAF50"
            />
          </svg>
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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"
              fill="#f44336"
            />
          </svg>
        </IconButton>
      </div>
      <div
        style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '8px' }}
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
