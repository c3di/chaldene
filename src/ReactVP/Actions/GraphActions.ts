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
  type ConnectionStatus,
  isSameType
} from '../Type';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  MarkerType
} from '@xyflow/react';
import StateActions from './StateActions';
import {
  getCenterPosition,
  getHandleRef,
  graphFromJSON,
  graphToJSON
} from '../Utils';
import { Spec2Node } from '../Spec';
import { findCycle, findNodeGroupsBetweenSourceChangers } from '../Type';

type GraphChange = {
  type: 'add' | 'remove' | 'select' | 'deselect';
  changedGraph: Graph;
};

function includes<T extends { id: string }>(array: T[], item: T): boolean {
  return array.some(i => i.id === item.id);
}

function isGraphEmpty(graph: Graph | undefined): boolean {
  return !graph || (graph.nodes.length === 0 && graph.edges.length === 0);
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

  public getConnecedEdgesToNodes = (nodes: Node[], graph: Graph): Edge[] => {
    const connectedEdges: Edge[] = [];
    for (const node of nodes) {
      for (const edge of graph.edges ?? []) {
        if (edge.source === node.id || edge.target === node.id) {
          connectedEdges.push(edge);
        }
      }
    }
    return connectedEdges;
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

  public isGraphEmpty = (): boolean => {
    return isGraphEmpty(this.graph);
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

  public isNodeConnected = (node: any): boolean => {
    return (
      this.graph?.edges.some(
        edge => edge.source === node.id || edge.target === node.id
      ) ?? false
    );
  };

  public selectAll = (): void => {
    this.applyGraphChanges([
      {
        type: 'select',
        changedGraph: { nodes: [], edges: [] }
      }
    ]);
  };

  public deselectAll = (): void => {
    this.applyGraphChanges([
      {
        type: 'deselect',
        changedGraph: { nodes: [], edges: [] }
      }
    ]);
  };

  public onNodesAdd = (newNodes: Node[], currentGraph: Graph): Graph => {
    return currentGraph;
  };

  public onEdgesAdd = (newEdges: Edge[], currentGraph: Graph): Graph => {
    const graph = this.updateHanldeConnectionsOnEdgeChange(
      newEdges,
      currentGraph,
      true
    );
    return graph;
  };

  public onNodesRemove = (removedNodes: Node[], currentGraph: Graph): Graph => {
    return currentGraph;
  };

  public onEdgesRemove = (removedEdges: Edge[], currentGraph: Graph): Graph => {
    const graph = this.updateHanldeConnectionsOnEdgeChange(
      removedEdges,
      currentGraph,
      false
    );
    return graph;
  };

  public updateHanldeConnectionsOnEdgeChange = (
    changedEdges: Edge[],
    graph: Graph,
    isAddEdge: boolean
  ): Graph => {
    for (const edge of changedEdges) {
      for (const node of graph.nodes ?? []) {
        if (node.id === edge!.source) {
          node.data.outputs = node.data.outputs?.map(output => {
            if (output.id === edge!.sourceHandle) {
              output.connections =
                (output.connections ?? 0) + (isAddEdge ? 1 : -1);
            }
            return output;
          });
        }
        if (node.id === edge!.target) {
          node.data.inputs = node.data.inputs?.map(input => {
            if (input.id === edge!.targetHandle) {
              input.connections =
                (input.connections ?? 0) + (isAddEdge ? 1 : -1);
            }
            return input;
          });
        }
      }
    }
    return graph;
  };

  // only entry point for all applying graph to avoid multiple state update and re-render
  public applyGraphChanges = (changes: GraphChange[]): void => {
    let graph = this.graph ?? { nodes: [], edges: [] };

    for (const change of changes) {
      if (change.type === 'add') {
        graph = this._addElements(change.changedGraph, graph);
      } else if (change.type === 'remove') {
        graph = this._removeElements(change.changedGraph, graph);
      } else if (change.type === 'select') {
        graph = this._handleSelectAllElements(graph, true);
      } else if (change.type === 'deselect') {
        graph = this._handleSelectAllElements(graph, false);
      }
    }

    graph = this._updateSyncGroups(graph);
    if (this.editorContext) {
      this.editorContext.blockTriggerRunCode = false;
    }
    this.stateAction(graph);
  };

  public addNodeFromSpec = (specName: string, position: IPosition): void => {
    const node = Spec2Node(
      specName,
      this.editorContext!.getNodeId(),
      position,
      this.editorContext
    );
    this.applyGraphChanges([
      {
        type: 'add',
        changedGraph: { nodes: [node], edges: [] }
      }
    ]);
  };

  private _addElements(addedGraph: Graph, graph: Graph): Graph {
    const { nodes: newNodes, edges: newEdges } = addedGraph;
    let newGraph =
      newNodes.length > 0 ? this.onNodesAdd(newNodes, graph) : graph;
    newGraph =
      newEdges.length > 0 ? this.onEdgesAdd(newEdges, newGraph) : newGraph;
    return {
      nodes: [...newGraph.nodes, ...newNodes],
      edges: [...newGraph.edges, ...newEdges]
    };
  }

  private _removeElements(removedGraph: Graph, graph: Graph): Graph {
    if (isGraphEmpty(removedGraph)) {
      return graph;
    }
    const nodesToRemove = removedGraph.nodes;
    const edgesToRemove = Array.from(
      new Set([
        ...this.getConnecedEdgesToNodes(nodesToRemove, graph),
        ...removedGraph.edges
      ])
    );
    let newGraph =
      nodesToRemove.length > 0
        ? this.onNodesRemove(nodesToRemove, graph)
        : graph;
    newGraph =
      edgesToRemove.length > 0
        ? this.onEdgesRemove(edgesToRemove, newGraph)
        : newGraph;

    return {
      nodes: newGraph.nodes.filter(n => !nodesToRemove.includes(n)),
      edges: newGraph.edges.filter(e => !edgesToRemove.includes(e))
    };
  }

  private _handleSelectAllElements = (
    graph: Graph,
    toSelect: boolean
  ): Graph => {
    return {
      nodes: graph.nodes.map(n => ({
        ...n,
        selected: toSelect
      })),
      edges: graph.edges.map(e => ({
        ...e,
        selected: toSelect
      }))
    };
  };

  public removeSelected = (): void => {
    this.applyGraphChanges([
      {
        type: 'remove',
        changedGraph: {
          nodes: this.getSelectedNodes(),
          edges: this.getSelectedEdges()
        }
      }
    ]);
  };

  public copy = (): Promise<void> => {
    const nodesToCopy = this.getSelectedNodes().map(node => ({
      ...node,
      selected: false,
      data: {
        ...node.data,
        editorContext: undefined,
        inputs: node.data.inputs?.map(input => ({ ...input, connections: 0 })),
        outputs: node.data.outputs?.map(output => ({
          ...output,
          connections: 0
        }))
      }
    }));
    const nodeIds = nodesToCopy.map(node => node.id);
    const edgesToCopy = this.getSelectedEdges()
      .filter(
        (e: any) => nodeIds.includes(e.source) && nodeIds.includes(e.target)
      )
      .map(edge => ({
        ...edge,
        selected: false
      }));

    if (isGraphEmpty({ nodes: nodesToCopy, edges: edgesToCopy })) {
      return Promise.resolve();
    }

    edgesToCopy.forEach(edge => {
      const sourceNode = nodesToCopy.find(n => n.id === edge.source);
      const targetNode = nodesToCopy.find(n => n.id === edge.target);
      if (sourceNode && targetNode) {
        const sourceHandle = sourceNode.data.outputs?.find(
          output => output.id === edge.sourceHandle
        );
        const targetHandle = targetNode.data.inputs?.find(
          input => input.id === edge.targetHandle
        );
        if (sourceHandle && targetHandle) {
          sourceHandle.connections = (sourceHandle.connections ?? 0) + 1;
          targetHandle.connections = (targetHandle.connections ?? 0) + 1;
        }
      }
    });

    const graphJSON = graphToJSON({ nodes: nodesToCopy, edges: edgesToCopy });
    return navigator.clipboard.writeText(graphJSON).catch(() => {
      alert('Copy failed: Unable to copy graph data.');
    });
  };

  public paste = (newPosition?: IPosition, offset?: IPosition): void => {
    navigator.clipboard
      .readText()
      .then(text => {
        const { nodes, edges } = graphFromJSON(text);
        if (isGraphEmpty({ nodes, edges })) {
          return;
        }

        const minX = Math.min(...nodes.map(node => node.position.x));
        const minY = Math.min(...nodes.map(node => node.position.y));
        const oldIdToNewId: Record<string, string> = {};
        const newNodes = nodes.map(node => {
          const newId = this.editorContext!.getNodeId();
          oldIdToNewId[node.id] = newId;
          return {
            ...node,
            id: newId,
            selected: true,
            position: {
              x:
                node.position.x +
                (offset?.x ?? 0) +
                (newPosition ? newPosition.x - minX : 0),

              y:
                node.position.y +
                (offset?.y ?? 0) +
                (newPosition ? newPosition.y - minY : 0)
            },
            data: {
              ...node.data,
              editorContext: this.editorContext
            }
          };
        });
        const newEdges = edges.map(edge => ({
          ...edge,
          selected: true,
          id: this.editorContext!.getEdgeId(),
          source: oldIdToNewId[edge.source],
          target: oldIdToNewId[edge.target]
        }));
        this.applyGraphChanges([
          {
            type: 'deselect',
            changedGraph: {
              nodes: [],
              edges: []
            }
          },
          {
            type: 'add',
            changedGraph: {
              nodes: newNodes,
              edges: newEdges
            }
          }
        ]);
      })
      .catch(() => {
        alert('Paste failed: Invalid graph data.');
      });
  };

  public cut = (): void => {
    this.copy()
      .then(() => {
        this.removeSelected();
      })
      .catch(error => {
        alert('Cut failed: ' + String(error.message || error.toString()));
      });
  };

  public duplicate = (): void => {
    this.copy().then(() => {
      this.paste(undefined, { x: 10, y: 10 });
    });
  };

  public disconnectHandle = (identifier: IHandleIdentifier): void => {
    this.applyGraphChanges([
      {
        type: 'remove',
        changedGraph: { nodes: [], edges: this.getConnecedEdges(identifier) }
      }
    ]);
  };

  public disconnectNode = (node: any): void => {
    this.applyGraphChanges([
      {
        type: 'remove',
        changedGraph: {
          nodes: [],
          edges: this.getConnecedEdgesToNodes([node], this.graph!)
        }
      }
    ]);
  };

  public applyNodeChanges = (changes: NodeChange[]): void => {
    const acceptChanges = changes.filter(change =>
      ['dimensions', 'select', 'position'].includes(change.type)
    );

    this.stateAction((currentGraph: Graph) => ({
      ...currentGraph,
      nodes: applyNodeChanges(acceptChanges, currentGraph.nodes)
    }));
  };

  public applyEdgeChanges = (changes: EdgeChange[]): void => {
    console.log('onEdgesChange', changes);
    const acceptChanges = changes.filter(change => change.type === 'select');

    this.stateAction((currentGraph: Graph) => ({
      nodes: currentGraph.nodes,
      edges: applyEdgeChanges(acceptChanges, currentGraph.edges)
    }));
  };

  public onConnectNode = (connection: Connection): void => {
    const graphChanges: GraphChange[] = [];
    const replacedEdges = this.graph?.edges.filter(
      edge =>
        edge.target === connection.target &&
        edge.targetHandle === connection.targetHandle
    );
    if (replacedEdges && replacedEdges.length > 0) {
      graphChanges.push({
        type: 'remove',
        changedGraph: {
          nodes: [],
          edges: replacedEdges
        }
      });
    }
    const newEdge = {
      ...connection,
      id: this.editorContext!.getEdgeId(),
      markerEnd: {
        type: MarkerType.Arrow,
        width: 30,
        height: 30
      }
    };
    graphChanges.push({
      type: 'add',
      changedGraph: {
        nodes: [],
        edges: [newEdge]
      }
    });
    this.applyGraphChanges(graphChanges);
  };

  public onConnectNodeStart = (event: React.MouseEvent, params: any): void => {
    this.connectFrom = params;
    this.editorContext?.action('menu').close();
  };

  public onConnectNodeEnd = (): void => {
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

    if (!isSameType(sourceHandle.type, targetHandle.type)) {
      return {
        status: 'reject',
        message: `"${sourceHandle.type}" and "${targetHandle.type}" not compatible.`
      };
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
    if (status.status === 'accept') {
      return true;
    }

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
        } else {
          this.editorContext?.action('menu').open(
            'connection',
            {
              clientX: centerPosition.clientX + 20,
              clientY: centerPosition.clientY
            },
            { status }
          );
        }
      }
    }
    return status.status !== 'reject';
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
    if (this.editorContext) {
      this.editorContext.blockTriggerRunCode = false;
    }
    this.stateAction((currentGraph: Graph) => ({
      ...currentGraph,
      nodes: currentGraph.nodes.map(n => {
        if (n.id !== nodeID) {
          return n;
        }
        // hack way to revert the in1's value for batch processing, todo: refactor
        if (n.data.specName === 'batch_process' && id === 'in0') {
          n.data.inputs![1].defaultValue = [];
        }
        return {
          ...n,
          data: {
            ...n.data,
            ...(category === 'properties'
              ? { [id]: value }
              : {
                  [category]: n.data[category]?.map((item: any) =>
                    item.id === id ? { ...item, defaultValue: value } : item
                  )
                })
          }
        };
      })
    }));
  };

  /*
   * @param identifier: string - editorID_nodeID_handleID
   */
  public updateInspection = (whichVar: string, value: any): void => {
    const [, nodeID, id] = whichVar.split('_');

    this.stateAction((currentGraph: Graph) => {
      const updatedGraph = {
        ...currentGraph,
        nodes: currentGraph.nodes.map(n => {
          if (n.id !== nodeID) {
            return n;
          }
          return {
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
          };
        })
      };
      return updatedGraph;
    });
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
          if (input.defaultValue === undefined || input.defaultValue === null) {
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
          if (input.defaultValue === undefined || input.defaultValue === null) {
            notReadyNodes[node.id] = [
              ...(notReadyNodes[node.id] ?? []),
              input.name
            ];
          }
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

  private _updateSyncGroups = (graph: Graph): Graph => {
    const nodeGroups = findNodeGroupsBetweenSourceChangers(graph);

    if (nodeGroups.length > 0) {
      return {
        ...graph,
        nodes: graph.nodes.map(node => {
          const groupIndex = nodeGroups.findIndex(group =>
            group.some(groupNode => groupNode.id === node.id)
          );

          return {
            ...node,
            data: {
              ...node.data,
              outputs: node.data.outputs?.map(output => {
                return {
                  ...output,
                  widget:
                    output.widget?.type === 'ImageViewer'
                      ? {
                          ...output.widget,
                          syncGroup: groupIndex !== -1 ? groupIndex : undefined
                        }
                      : output.widget
                };
              })
            }
          };
        })
      };
    }

    return graph;
  };
}
