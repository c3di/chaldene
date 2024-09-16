import { isInputViaConnection, type Position } from '../Type';
import Actions from './Actions';
import ELK from 'elkjs/lib/elk.bundled.js';
import { type ReactFlowInstance } from '@xyflow/react';
import { getBoundingClientRect, getHandleRef, getNodeRef } from '../Utils';

export default class SceneActions extends Actions {
  private readonly reactFlowInstance: ReactFlowInstance<any, any>;
  private readonly elk: any;

  constructor(reactFlowInstance: ReactFlowInstance<any, any>) {
    super();
    this.reactFlowInstance = reactFlowInstance;
    this.elk = new ELK();
  }

  public getZoom = (): number => {
    return this.reactFlowInstance.getZoom();
  };

  public focusOn = async (nodeID: string): Promise<void> => {
    const node = this.editorContext?.action('graph').getNodeByID(nodeID);
    const { x, y } = node.position;
    const width: number = node.measured.width;
    const height: number = node.measured.height;
    console.log('focusOn', x, y, width, height);
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    await this.reactFlowInstance.setCenter(x + width / 2.0, y + height / 2.0, {
      duration: 200,
      zoom: this.reactFlowInstance.getZoom()
    });
  };

  public fitView = async (): Promise<void> => {
    await this.reactFlowInstance.fitView();
  };

  public clientToScenePosition = ({ x, y }: Position): Position => {
    const scenePosition = this.reactFlowInstance.screenToFlowPosition({
      x,
      y
    });
    return scenePosition;
  };

  public autoLayout = async (): Promise<void> => {
    // todo for comments
    const layoutOptions = {
      algorithm: 'layered',
      edgeRouting: 'SPLINES',
      portConstraints: 'FIXED_POS',
      //  hierarchyHandling: 'INCLUDE_CHILDREN',
      'layered.spacing.nodeNodeBetweenLayers': '20',
      'elk.layered.nodePlacement.strategy': 'SIMPLE',
      'elk.padding': '[top=16.0,left=16.0,bottom=16.0,right=16.0]'
    };
    const portID = (nodeID: string, handleID: string): string =>
      `p${nodeID}${handleID}`;
    const graph = this.editorContext?.graph;
    if (!graph) {
      return;
    }
    const { nodes, edges } = graph;
    const elKNodes = nodes.map(node => {
      const nodeRect = getBoundingClientRect(
        getNodeRef(node.id, this.editorContext?.editorID)!
      );
      const inputPorts: any[] = [];
      for (const input of node.data.inputs ?? []) {
        if (!isInputViaConnection(input)) {
          continue;
        }
        const portRect = getBoundingClientRect(
          getHandleRef(
            this.editorContext!.editorID,
            node.id,
            input.id,
            'target'
          )!
        );
        inputPorts.push({
          id: portID(node.id, input.id),
          x: portRect.x - nodeRect.x,
          y: portRect.y - nodeRect.y,
          height: portRect.height,
          width: portRect.width
        });
      }

      const outputPorts = node.data.outputs?.map(output => {
        const portRect = getBoundingClientRect(
          getHandleRef(
            this.editorContext!.editorID,
            node.id,
            output.id,
            'source'
          )!
        );
        return {
          id: portID(node.id, output.id),
          x: portRect.x - nodeRect.x,
          y: portRect.y - nodeRect.y,
          height: portRect.height,
          width: portRect.width
        };
      });
      return {
        id: node.id,
        x: nodeRect.x,
        y: nodeRect.y,
        width: nodeRect.width,
        height: nodeRect.height,
        properties: {
          'org.eclipse.elk.portConstraints': 'FIXED_ORDER'
        },
        ports: [...(inputPorts ?? []), ...(outputPorts ?? [])]
      };
    });
    const elkEdges = edges.map((edge: any) => ({
      id: edge.id,
      sources: [portID(edge.source, edge.sourceHandle)],
      targets: [portID(edge.target, edge.targetHandle)]
    }));

    this.elk
      .layout({
        id: 'root',
        children: elKNodes,
        edges: elkEdges,
        layoutOptions
      })
      .then((layoutedGraph: any) => {
        const layoutedNodes = nodes.map(node => {
          const layoutedNode = layoutedGraph.children?.find(
            (lgNode: any) => lgNode.id === node.id
          );
          return {
            ...node,
            position: {
              x: layoutedNode?.x ?? 0,
              y: layoutedNode?.y ?? 0
            }
          };
        });

        this.editorContext?.action('graph').overrideGraph({
          nodes: layoutedNodes,
          edges
        });

        void this.fitView();
      });
  };
}
