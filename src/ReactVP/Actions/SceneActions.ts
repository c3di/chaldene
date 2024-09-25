import { type IPosition } from '../Type';
import Actions from './Actions';
import ELK from 'elkjs/lib/elk.bundled.js';
import { type ReactFlowInstance } from '@xyflow/react';

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

  public clientToScenePosition = ({ x, y }: IPosition): IPosition => {
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
      // portConstraints: 'FIXED_POS',
      // hierarchyHandling: 'INCLUDE_CHILDREN',
      'layered.spacing.nodeNodeBetweenLayers': '40',
      'elk.layered.nodePlacement.strategy': 'BRANCH',
      'elk.padding': '[top=16.0,left=16.0,bottom=16.0,right=16.0]'
    };
    const graph = this.editorContext?.graph;
    if (!graph) {
      return;
    }
    const { nodes, edges } = graph;
    const elKNodes = nodes.map(node => {
      return {
        id: node.id,
        width: node.measured?.width,
        height: node.measured?.height
      };
    });
    const elkEdges = edges.map((edge: any) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target]
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
        window.requestAnimationFrame(() => {
          void this.fitView();
        });
      });
  };
}
