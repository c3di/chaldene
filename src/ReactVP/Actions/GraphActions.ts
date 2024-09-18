import {
  type IHandleIdentifier,
  type Graph,
  isUsedAsInput,
  type Edge,
  type Node,
  type IPosition,
  type Identifier,
  type ValueCategory,
  type IHandle,
  type ConnectionStatus
} from '../Type';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  EdgeRemoveChange
} from '@xyflow/react';
import StateActions from './StateActions';
import {
  getCenterPosition,
  getHandleRef,
  graphFromJSON,
  graphToJSON
} from '../Utils';
import { Spec2Node } from '../Spec';
import { findCycle } from '../Type';

function includes<T extends { id: string }>(array: T[], item: T): boolean {
  return array.some(i => i.id === item.id);
}

export default class GraphActions extends StateActions {
  private connectFrom: any = null;

  get graph(): Graph | undefined {
    return this.editorContext?.graph;
  }

  public overrideGraph = (graph: Graph): void => {
    this.stateAction(graph);
  };

  public newGraphInput = (graph: Graph): void => {
    this.stateAction({
      nodes: graph.nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          editorContext: this.editorContext
        }
      })),
      edges: graph.edges
    });
  };

  public getSelectedNodes = (): Node[] => {
    return this.graph?.nodes.filter(n => n.selected) ?? [];
  };

  public getSelectedEdges = (): Edge[] => {
    return this.graph?.edges.filter(e => e.selected) ?? [];
  };

  public isGraphEmpty = (): boolean => {
    return this.graph?.nodes.length === 0 && this.graph?.edges.length === 0;
  };

  public selectAll = (): void => {
    this.stateAction((currentGraph: Graph) => {
      return {
        nodes: currentGraph.nodes.map(n => ({
          ...n,
          selected: true
        })),
        edges: currentGraph.edges.map(e => ({
          ...e,
          selected: true
        }))
      };
    });
  };

  public deselectAll = (): void => {
    this.stateAction((currentGraph: Graph) => {
      return {
        nodes: currentGraph.nodes.map(n => ({
          ...n,
          selected: false
        })),
        edges: currentGraph.edges.map(e => ({
          ...e,
          selected: false
        }))
      };
    });
  };

  public addNodeFromSpec = (specName: string, position: IPosition): void => {
    const node = Spec2Node(
      specName,
      this.editorContext!.getNodeId(),
      position,
      this.editorContext
    );
    this.stateAction((currentGraph: Graph) => ({
      ...currentGraph,
      nodes: [...currentGraph.nodes, node]
    }));
  };

  public add(graph: Graph, leftTopPosition: IPosition): void {
    const { nodes, edges } = graph;
    if (nodes.length === 0 && edges.length === 0) {
      return;
    }
    const minX = Math.min(...nodes.map(node => node.position.x));
    const minY = Math.min(...nodes.map(node => node.position.y));
    console.log(leftTopPosition, minX, minY);
    const oldIdToNewId: Record<string, string> = {};
    const newNodes = nodes.map(node => {
      const newId = this.editorContext!.getNodeId();
      oldIdToNewId[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x - minX + leftTopPosition.x,
          y: node.position.y - minY + leftTopPosition.y
        },
        data: {
          ...node.data,
          editorContext: this.editorContext
        }
      };
    });
    console.log(newNodes);
    const newEdges = edges.map(edge => ({
      ...edge,
      id: this.editorContext!.getEdgeId(),
      source: oldIdToNewId[edge.source],
      target: oldIdToNewId[edge.target]
    }));
    this.stateAction((currentGraph: Graph) => ({
      nodes: [...currentGraph.nodes, ...newNodes],
      edges: [...currentGraph.edges, ...newEdges]
    }));
  }

  public remove = (): void => {
    console.log('removeSelectedElements');
    this.stateAction((currentGraph: Graph) => {
      const removedNodes = currentGraph.nodes.filter(n => n.selected);
      const nodeChanges: NodeChange[] = removedNodes.map(n => ({
        id: n.id,
        type: 'remove'
      }));
      const edgeChanges: EdgeChange[] = currentGraph.edges
        .filter(e => e.selected)
        .map(e => ({
          id: e.id,
          type: 'remove'
        }));

      let nodes = applyNodeChanges(nodeChanges, currentGraph.nodes);
      nodes = this.updateOnNodeRemoved(removedNodes, nodes);
      return {
        nodes: this.updateOnEdgeChanges(edgeChanges, nodes),
        edges: applyEdgeChanges(edgeChanges, currentGraph.edges)
      };
    });
  };

  public copy = (): void => {
    console.log('copySelectedNodes');
    const nodes = this.getSelectedNodes();
    const edges = this.getSelectedEdges().filter((e: any) => {
      return nodes[e.source] && nodes[e.target];
    });
    if (nodes.length === 0 && edges.length === 0) {
      return;
    }
    navigator.clipboard
      .writeText(
        graphToJSON({
          nodes,
          edges
        })
      )
      .catch(error => {
        alert('Copy failed: ' + String(error.message || error.toString()));
      });
  };

  public paste = (position: IPosition): void => {
    navigator.clipboard
      .readText()
      .then(text => {
        console.log('paste', text);
        this.deselectAll();
        const { nodes, edges } = graphFromJSON(text);
        if (nodes.length === 0 && edges.length === 0) {
          return;
        }
        this.add(
          {
            nodes: nodes.map(n => ({ ...n, selected: true })),
            edges: edges.map(e => ({ ...e, selected: true }))
          },
          position
        );
      })
      .catch(() => {
        alert('Paste failed: Invalid graph data.');
      });
  };

  public cut = (): void => {
    console.log('cutSelectedNodes');
    const nodes = this.getSelectedNodes();
    const edges = this.getSelectedEdges().filter((e: any) => {
      return nodes[e.source] && nodes[e.target];
    });
    navigator.clipboard
      .writeText(
        graphToJSON({
          nodes,
          edges
        })
      )
      .then(() => {
        this.remove();
      })
      .catch(error => {
        alert('Cut failed: ' + String(error.message || error.toString()));
      });
  };

  public duplicate = (): void => {
    console.log('duplicateSelectedNodes');
    this.stateAction((currentGraph: Graph) => {
      const nodes = currentGraph.nodes.filter(n => n.selected);
      const edges = currentGraph.edges.filter(
        (e: any) => e.selected && nodes[e.source] && nodes[e.target]
      );
      const oldIdToNewId: Record<string, string> = {};
      const newNodes = nodes.map(node => {
        const newId = this.editorContext!.getNodeId();
        oldIdToNewId[node.id] = newId;
        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + 10,
            y: node.position.y + 10
          },
          selected: true,
          data: {
            ...node.data,
            editorContext: this.editorContext
          }
        };
      });
      const newEdges = edges.map(edge => ({
        ...edge,
        id: this.editorContext!.getEdgeId(),
        source: oldIdToNewId[edge.source],
        target: oldIdToNewId[edge.target],
        selected: true
      }));
      return {
        nodes: [
          ...currentGraph.nodes.map(n => ({
            ...n,
            selected: false
          })),
          ...newNodes
        ],
        edges: [
          ...currentGraph.edges.map(e => ({
            ...e,
            selected: false
          })),
          ...newEdges
        ]
      };
    });
  };

  public selectNodeOnContextMenuOpen = (node: any): void => {
    this.stateAction((currentGraph: Graph) => {
      const currentAllSelected = currentGraph.nodes.filter(n => n.selected);
      const alreadySelected = includes(currentAllSelected, node);
      if (alreadySelected) {
        return currentGraph;
      }
      return {
        nodes: currentGraph.nodes.map(n => ({
          ...n,
          selected: n.id === node.id
        })),
        edges: currentGraph.edges.map(e => ({
          ...e,
          selected: false
        }))
      };
    });
  };

  public selectEdgeOnContextMenuOpen = (edge: any): void => {
    this.stateAction((currentGraph: Graph) => {
      const currentAllSelected = currentGraph.edges.filter(e => e.selected);
      const alreadySelected = includes(currentAllSelected, edge);
      if (alreadySelected) {
        return currentGraph;
      }
      return {
        nodes: currentGraph.nodes.map(n => ({
          ...n,
          selected: false
        })),
        edges: currentGraph.edges.map(e => ({
          ...e,
          selected: e.id === edge.id
        }))
      };
    });
  };

  public applyNodeChanges = (changes: NodeChange[]): void => {
    console.log('onNodesChange', changes);
    const _applyNodeChanges = (
      changes: NodeChange[],
      nodes: Node[]
    ): Node[] => {
      const nds = this.updateOnNodeChanges(changes, nodes);
      return applyNodeChanges(changes, nds).map(n => ({
        ...n,
        data: {
          ...n.data,
          editorContext: this.editorContext
        }
      }));
    };

    this.stateAction((currentGraph: Graph) => ({
      ...currentGraph,
      nodes: _applyNodeChanges(changes, currentGraph.nodes)
    }));
  };

  public applyEdgeChanges = (changes: EdgeChange[]): void => {
    console.log('onEdgesChange', changes);
    this.stateAction((currentGraph: Graph) => ({
      nodes: this.updateOnEdgeChanges(changes, currentGraph.nodes),
      edges: applyEdgeChanges(changes, currentGraph.edges)
    }));
  };

  public getNodeByID = (nodeID: string): Node | undefined => {
    return this.graph?.nodes.find(node => node.id === nodeID);
  };

  public getHandle = (identifier: IHandleIdentifier): IHandle | undefined => {
    const { nodeID, id } = identifier;
    const node = this.getNodeByID(nodeID);
    if (!node) {
      return undefined;
    }
    return isUsedAsInput(identifier)
      ? node.data.inputs?.find(input => input.id === id)
      : node.data.outputs?.find(output => output.id === id);
  };

  public getConnectionCount = (identity: IHandleIdentifier): number => {
    const { nodeID, id } = identity;
    const node = this.getNodeByID(nodeID);
    if (!node) {
      return 0;
    }
    return isUsedAsInput(identity)
      ? (this.graph?.edges.filter(
          edge => edge.target === nodeID && edge.targetHandle === id
        ).length ?? 0)
      : (this.graph?.edges.filter(
          edge => edge.source === nodeID && edge.sourceHandle === id
        ).length ?? 0);
  };

  public onConnectNode = (connection: Connection): void => {
    console.log('onConnect', connection);
    this.stateAction((currentGraph: Graph) => {
      const replacedEdges = currentGraph.edges.filter(
        edge =>
          edge.target === connection.target &&
          edge.targetHandle === connection.targetHandle
      );
      const changes: EdgeChange[] = replacedEdges.map(e => ({
        id: e.id,
        type: 'remove'
      }));
      const nodes = this.updateOnEdgeChanges(changes, currentGraph.nodes);

      const edges = currentGraph.edges.filter(
        edge =>
          edge.target !== connection.target ||
          edge.targetHandle !== connection.targetHandle
      );
      return {
        nodes: this.updateOnEdgeChange(connection, nodes, true),
        edges: addEdge(connection, edges)
      };
    });
  };

  public onConnectNodeStart = (event: React.MouseEvent, params: any): void => {
    console.log('onConnectStart');
    this.connectFrom = params;
    this.editorContext?.action('menu').close();
  };

  public onConnectNodeEnd = (): void => {
    console.log('onConnectEnd');
    this.connectFrom = null;
    this.editorContext?.action('menu').close();
  };

  private readonly validateConnection = (
    connection: Connection
  ): ConnectionStatus => {
    const { source, target } = connection;
    if (source === target) {
      return { status: 'reject', message: 'Cannot connect to same node' };
    }

    const sourceHandle = this.getHandle({
      nodeID: source,
      id: connection.sourceHandle!,
      type: 'source'
    });
    const targetHandle = this.getHandle({
      nodeID: target,
      id: connection.targetHandle!,
      type: 'target'
    });
    if (!sourceHandle || !targetHandle) {
      return { status: 'reject', message: 'Directions not compatible.' };
    }

    if (
      sourceHandle.type !== targetHandle.type &&
      !sourceHandle.type &&
      !targetHandle.type
    ) {
      return { status: 'reject', message: 'Types not compatible.' };
    }

    const cycle = findCycle({
      nodes: this.graph?.nodes ?? [],
      edges: [...(this.graph?.edges ?? []), ...[{ ...connection, id: 'temp' }]]
    });
    if (cycle) {
      return { status: 'reject', message: 'Cycle detected' };
    }

    if (
      this.getConnectionCount({
        nodeID: target,
        id: connection.targetHandle!,
        type: 'target'
      }) > 0
    ) {
      return { status: 'replace', message: 'Replace existing connection' };
    }

    return {
      status: 'accept',
      message: 'Connection valid'
    };
  };

  public isValidConnection = (connection: Connection): boolean => {
    const status = this.validateConnection(connection);
    console.log('isValidConnection', connection);
    if (this.connectFrom) {
      const isFromSource = this.connectFrom.handleType === 'source';
      const connectTo = getHandleRef(
        this.editorContext?.editorID ?? '',
        isFromSource ? connection.target : connection.source,
        isFromSource ? connection.targetHandle! : connection.sourceHandle!
      );
      if (connectTo) {
        const centerPosition = getCenterPosition(connectTo);
        if (!centerPosition) {
          console.error('centerPosition is null', connectTo);
        }
        this.editorContext
          ?.action('menu')
          .open('connection', centerPosition, { status });
      }
    }
    return status.status === 'accept' || status.status === 'replace';
  };

  public getConnecedEdges = (identifier: IHandleIdentifier): Edge[] => {
    const { nodeID, id: handleID, type } = identifier;
    if (type === 'target') {
      return (
        this.graph?.edges.filter(
          edge => edge.targetHandle === handleID && edge.target === nodeID
        ) ?? []
      );
    }
    return (
      this.graph?.edges.filter(
        edge => edge.sourceHandle === handleID && edge.source === nodeID
      ) ?? []
    );
  };

  public isHandleConnected = (identifier: IHandleIdentifier): boolean => {
    const { nodeID, id: handleID, type } = identifier;
    if (type === 'target') {
      return (
        this.graph?.edges.some(
          edge => edge.targetHandle === handleID && edge.target === nodeID
        ) ?? false
      );
    }
    return (
      this.graph?.edges.some(
        edge => edge.sourceHandle === handleID && edge.source === nodeID
      ) ?? false
    );
  };

  public disconnectHandle = (identifier: IHandleIdentifier): void => {
    this.stateAction((currentGraph: Graph) => {
      const edges = this.getConnecedEdges(identifier);
      const changes: EdgeChange[] = edges.map(e => ({
        id: e.id,
        type: 'remove'
      }));

      return {
        nodes: this.updateOnEdgeChanges(changes, currentGraph.nodes),
        edges: applyEdgeChanges(changes, currentGraph.edges)
      };
    });
  };

  public updateOnNodeChanges = (
    changes: NodeChange[],
    nodes: Node[]
  ): Node[] => {
    let nds = nodes;
    for (const change of changes) {
      if (change.type === 'remove') {
        const node = nodes.find(n => n.id === change.id);
        if (node) {
          nds = this.updateOnNodeRemoved([node], nodes);
        }
      }
    }
    return nds;
  };

  public updateOnNodeRemoved = (
    removedNodes: Node[],
    nodes: Node[]
  ): Node[] => {
    let nds = nodes;
    for (const n of removedNodes) {
      const edgeChanges = this.graph?.edges
        .filter(edge => edge.source === n.id || edge.target === n.id)
        .map(
          e =>
            ({
              id: e.id,
              type: 'remove'
            }) as EdgeRemoveChange
        );
      if (edgeChanges) {
        nds = this.updateOnEdgeChanges(edgeChanges, nds);
      }
    }
    return nds;
  };

  public updateOnEdgeChanges = (
    edgeChanges: EdgeChange[],
    nodes: Node[]
  ): Node[] => {
    let nds = nodes;
    for (const change of edgeChanges) {
      if (change.type === 'remove') {
        const edge = this.graph?.edges.find(e => e.id === change.id);
        nds = this.updateOnEdgeChange(edge!, nds, false);
      }
    }
    return nds;
  };

  public updateOnEdgeChange(
    edge: Edge | Connection,
    nodes: Node[],
    isConnected: boolean
  ): Node[] {
    for (const node of nodes) {
      if (node.id === edge!.source) {
        node.data.outputs = node.data.outputs?.map(output => {
          if (output.id === edge!.sourceHandle) {
            output.connections =
              (output.connections ?? 0) + (isConnected ? 1 : -1);
          }
          return output;
        });
      }
      if (node.id === edge!.target) {
        node.data.inputs = node.data.inputs?.map(input => {
          if (input.id === edge!.targetHandle) {
            input.connections =
              (input.connections ?? 0) + (isConnected ? 1 : -1);
          }
          return input;
        });
      }
    }
    return nodes;
  }

  public isNodeConnected = (node: any): boolean => {
    return (
      this.graph?.edges.some(
        edge => edge.source === node.id || edge.target === node.id
      ) ?? false
    );
  };

  public disconnectNode = (node: any): void => {
    console.log('breakAllConnections');
    this.stateAction((currentGraph: Graph) => {
      const changes: EdgeChange[] = currentGraph.edges
        .filter(e => e.source === node.id || e.target === node.id)
        .map(e => ({
          id: e.id,
          type: 'remove'
        }));
      return {
        nodes: this.updateOnEdgeChanges(changes, currentGraph.nodes),
        edges: applyEdgeChanges(changes, currentGraph.edges)
      };
    });
  };

  public setValue = (
    category: ValueCategory,
    identifier?: Identifier,
    value?: any
  ): void => {
    console.log('setValue', identifier, category, value);
    if (!identifier || !category) {
      return;
    }
    const { nodeID, id } = identifier;
    this.stateAction((currentGraph: Graph) => ({
      ...currentGraph,
      nodes: currentGraph.nodes.map(n =>
        n.id === nodeID
          ? {
              ...n,
              data: {
                ...n.data,
                [category]: n.data[category]?.map((item: any) =>
                  item.id === id ? { ...item, defaultValue: value } : item
                )
              }
            }
          : n
      )
    }));
  };

  /*
   * @param identifier: string - editorID_nodeID_handleID
   */
  public updateInspection = (whichVar: string, value: any): void => {
    const [, nodeID, id] = whichVar.split('_');
    this.stateAction((currentGraph: Graph) => ({
      ...currentGraph,
      nodes: currentGraph.nodes.map(n =>
        n.id === nodeID
          ? {
              ...n,
              data: {
                ...n.data,
                inputs: n.data.inputs?.map((item: any) =>
                  item.id === id
                    ? {
                        ...item,
                        widget: {
                          ...item.widget,
                          value
                        }
                      }
                    : item
                ),
                outputs: n.data.outputs?.map((item: any) =>
                  item.id === id
                    ? {
                        ...item,
                        widget: {
                          ...item.widget,
                          value
                        }
                      }
                    : item
                )
              }
            }
          : n
      )
    }));
  };

  public findNotReadyNodesForExecute = (): Record<string, string[]> => {
    if (!this.graph) {
      return {};
    }
    const notReadyNodes: Record<string, string[]> = {};
    for (const node of this.graph?.nodes ?? []) {
      if (!node.data.inputs || node.data.inputs.length === 0) {
        continue;
      }
      for (const input of node.data.inputs) {
        if (input.widget?.type) {
          if (input.defaultValue === undefined && input.defaultValue === null) {
            notReadyNodes[node.id] = [
              ...(notReadyNodes[node.id] ?? []),
              input.name
            ];
          }
        } else if (
          !this.graph.edges.some(
            edge => edge.target === node.id && edge.targetHandle === input.id
          )
        ) {
          notReadyNodes[node.id] = [
            ...(notReadyNodes[node.id] ?? []),
            input.name
          ];
        }
      }
    }
    return notReadyNodes;
  };

  public checkExecutionReadiness = (): boolean => {
    const nodesAndInputs = this.findNotReadyNodesForExecute();
    const isReady = Object.keys(nodesAndInputs).length === 0;
    if (!isReady) {
      this.editorContext?.action('panels').open('notReadyNodePanel', {
        notReadyNodes: nodesAndInputs
      });
    }
    return isReady;
  };
}
