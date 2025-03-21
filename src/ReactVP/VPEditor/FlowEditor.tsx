import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlowProvider
} from '@xyflow/react';
import ControlPanel from './ControlPanel';
import { SceneActions } from '../Actions';
import { type Graph } from '../Type';
import type EditorContext from '../EditorContext';

export interface IFlowEditorProps {
  id: string;
  graph?: Graph;
  editorContext: EditorContext;
  focused: boolean;
}

export default function FlowEditor({
  id,
  graph,
  editorContext,
  focused
}: IFlowEditorProps): JSX.Element {
  const menuActions = editorContext.action('menu');
  const graphActions = editorContext.action('graph');
  return (
    <ReactFlowProvider>
      <ReactFlow
        tabIndex={0}
        id={id}
        onInit={reactFlowInstance => {
          editorContext.registAction(
            'scene',
            new SceneActions(reactFlowInstance)
          );
          reactFlowInstance.fitView();
        }}
        // for rendering
        nodeTypes={editorContext.nodeTypes}
        nodes={graph?.nodes}
        edges={graph?.edges}
        // for interaction
        onNodesChange={graphActions.applyNodeChanges}
        onEdgesChange={graphActions.applyEdgeChanges}
        onConnect={graphActions.onConnectNode}
        onConnectStart={graphActions.onConnectNodeStart}
        onConnectEnd={graphActions.onConnectNodeEnd}
        isValidConnection={graphActions.isValidConnection}
        onPaneClick={menuActions.close}
        onNodeClick={menuActions.close}
        onEdgeClick={menuActions.close}
        onNodeDragStart={menuActions.close}
        onSelectionStart={menuActions.close}
        onMove={menuActions.close}
        // for context menu
        onNodeContextMenu={(e: React.MouseEvent, node: any) => {
          graphActions.selectNodeOnContextMenuOpen(node);
          menuActions.open('node', e, { forWhom: node });
        }}
        onEdgeContextMenu={(e: React.MouseEvent, edge: any) => {
          graphActions.selectEdgeOnContextMenuOpen(edge);
          menuActions.open('edge', e, { forWhom: edge });
        }}
        onPaneContextMenu={(e: React.MouseEvent | MouseEvent) => {
          graphActions.deselectAll();
          menuActions.open('panel', e, {});
        }}
        // configuration
        selectionOnDrag
        maxZoom={3}
        minZoom={0.5}
        panOnDrag={[2]}
        multiSelectionKeyCode="Shift"
        deleteKeyCode="Delete"
        panActivationKeyCode={'Alt'}
        // todo: when Control is pressed, pan along horizontal axis
        zoomOnDoubleClick={false}
        connectOnClick={false}
        selectionKeyCode={null}
        zoomActivationKeyCode={null}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={10}
        proOptions={{ hideAttribution: true }}
      >
        {focused && <ControlPanel editorContext={editorContext} />}
        <Background variant={BackgroundVariant.Dots} />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
