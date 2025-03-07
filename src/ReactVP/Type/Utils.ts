import { type Edge } from './Edge';
import { type Node } from './Node';
import { type Graph } from './Graph';

export function findCycle(graph: Graph): Edge | null {
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const adjacencyList: Record<string, Edge[]> = {};

  graph.edges.forEach(edge => {
    if (!adjacencyList[edge.source]) {
      adjacencyList[edge.source] = [];
    }
    adjacencyList[edge.source].push(edge);
  });

  function dfs(node: string, path: string[], edgePath: Edge[]): Edge | null {
    if (visiting.has(node)) {
      return edgePath[edgePath.length - 1];
    }
    if (visited.has(node)) {
      return null;
    }

    visiting.add(node);
    path.push(node);

    for (const edge of adjacencyList[node] || []) {
      const causingEdge = dfs(edge.target, path, [...edgePath, edge]);
      if (causingEdge) {
        return causingEdge;
      }
    }

    visiting.delete(node);
    visited.add(node);
    path.pop();
    return null;
  }

  for (const node of graph.nodes) {
    const cycleResult = dfs(node.id, [], []);
    if (cycleResult) {
      return cycleResult; // Return the first cycle found
    }
  }

  return null;
}

function getNodeByID(nodes: Node[], nodeID: string): Node | undefined {
  return nodes.find(node => node.id === nodeID);
}

export function topologicalSortDAG(graph: Graph): Node[] {
  const { nodes, edges } = graph;
  const adjacencyList: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};

  nodes.forEach(node => {
    inDegree[node.id] = 0;
    adjacencyList[node.id] = [];
  });
  edges.forEach(({ source, target }) => {
    if (adjacencyList[source]) {
      adjacencyList[source].push(target);
      inDegree[target]++;
    }
  });

  const zeroInDegreeQueue: string[] = Object.keys(inDegree).filter(
    id => inDegree[id] === 0
  );

  const topoOrder: Node[] = [];
  while (zeroInDegreeQueue.length > 0) {
    const id = zeroInDegreeQueue.shift()!;
    topoOrder.push(getNodeByID(nodes, id)!);
    adjacencyList[id].forEach(neighbor => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        zeroInDegreeQueue.push(neighbor);
      }
    });
  }

  const disconnectedNodes = nodes.filter(node => !topoOrder.includes(node));

  return [...topoOrder, ...disconnectedNodes];
}

function isSameCode(
  nodeA: Node,
  incommigEdgesA: Edge[],
  nodeB: Node,
  incommigEdgesB: Edge[]
): boolean {
  if (nodeA.id !== nodeB.id) {
    return false;
  }
  const {
    inputs: inputsA = [],
    outputs: outputsA = [],
    extraRun: extraRunA
  } = nodeA.data;
  const {
    inputs: inputsB = [],
    outputs: outputsB = [],
    extraRun: extraRunB
  } = nodeB.data;

  // Check if extraRun has changed
  if (extraRunA !== extraRunB) {
    return false;
  }

  for (let i = 0; i < inputsA.length; i++) {
    const edgeA = incommigEdgesA.find(e => e.targetHandle === inputsA[i].id);
    const edgeB = incommigEdgesB.find(e => e.targetHandle === inputsB[i].id);
    if (edgeA && edgeB) {
      if (
        edgeA.source !== edgeB.source ||
        edgeA.sourceHandle !== edgeB.sourceHandle
      ) {
        return false;
      }
    } else if (edgeA || edgeB) {
      return false;
    } else if (inputsA[i].defaultValue !== inputsB[i].defaultValue) {
      return false;
    }
  }

  for (let i = 0; i < outputsA.length; i++) {
    if (outputsA[i].name !== outputsB[i].name) {
      return false;
    }
  }
  return true;
}

export function findCodeChangeNodes(
  prevGraph: Graph | undefined,
  nextGraph: Graph
): Node[] {
  if (!prevGraph) {
    return nextGraph.nodes;
  }

  const { nodes: prevNodes, edges: prevEdges } = prevGraph;
  const { nodes: nextNodes, edges: nextEdges } = nextGraph;

  const changedNodes = nextNodes.filter(nextNode => {
    const prevNode = getNodeByID(prevNodes, nextNode.id);
    if (!prevNode) {
      return true;
    }

    const prevIncomingEdges = prevEdges.filter(
      edge => edge.target === prevNode.id
    );
    const nextIncomingEdges = nextEdges.filter(
      edge => edge.target === nextNode.id
    );

    return !isSameCode(
      prevNode,
      prevIncomingEdges,
      nextNode,
      nextIncomingEdges
    );
  });
  return changedNodes;
}

/**
 * Search for a subgraph that contains all nodes and edges that are connected to the given nodes.
 */
export function findConnectedSubgraph(
  graph: Graph,
  nodes?: Node[],
  only_descendants = true,
  exclude_nodes: Node[] = []
): Graph | null {
  if (!nodes || nodes.length === 0) {
    return null;
  }

  if (nodes.length === graph.nodes.length) {
    return graph;
  }

  const excludedNodeIds = new Set(exclude_nodes.map(node => node.id));

  const { nodes: graphNodes, edges: graphEdges } = graph;
  const nodeSet = new Set(nodes.map(node => node.id));
  const includedNodeIds = new Set<string>();
  const includedEdges = new Set<Edge>();

  function dfs(nodeID: string): void {
    if (includedNodeIds.has(nodeID)) {
      return;
    }
    includedNodeIds.add(nodeID);

    graphEdges.forEach(edge => {
      if (edge.source === nodeID) {
        includedEdges.add(edge);
        if (!excludedNodeIds.has(edge.target)) {
          dfs(edge.target);
        }
      }
    });

    graphEdges.forEach(edge => {
      if (edge.target === nodeID) {
        includedEdges.add(edge);
        if (!only_descendants) {
          if (!excludedNodeIds.has(edge.source)) {
            dfs(edge.source);
          }
        }
      }
    });
  }

  nodeSet.forEach(nodeID => {
    dfs(nodeID);
  });

  const includedNodes = graphNodes.filter(node => includedNodeIds.has(node.id));

  return {
    nodes: includedNodes,
    edges: Array.from(includedEdges)
  };
}

export function findCodeChangedGraph(
  prevGraph: Graph | undefined,
  nextGraph: Graph
): Graph | null {
  const nodes = findCodeChangeNodes(prevGraph, nextGraph);
  return findConnectedSubgraph(nextGraph, nodes);
}

/**
 * Find all groups of nodes that are between source-changing nodes in the graph.
 * Each group contains nodes that are reachable from one source-changing node until the next source-changing node(s).
 * A source-changing node is one where the sourceChanged property is true.
 */
export function findNodeGroupsBetweenSourceChangers(graph: Graph): Node[][] {
  const { nodes: graphNodes, edges: graphEdges } = graph;
  const visited = new Set<string>();
  const nodeGroups: Node[][] = [];

  // Create adjacency list for faster lookups
  const adjacencyList: Record<string, Edge[]> = {};
  graphEdges.forEach(edge => {
    if (!adjacencyList[edge.source]) {
      adjacencyList[edge.source] = [];
    }
    adjacencyList[edge.source].push(edge);
  });

  function isSourceChangingNode(node: Node): boolean {
    return node.data.sourceChanged === true;
  }

  // Check if there are any source-changing nodes in the graph
  const hasSourceChangingNodes = graphNodes.some(node =>
    isSourceChangingNode(node)
  );
  if (!hasSourceChangingNodes) {
    return [];
  }

  function collectGroup(startNodeId: string): void {
    const currentGroup = new Set<string>();
    const nextSourceChangingNodes = new Set<string>();

    function dfs(nodeId: string): void {
      if (visited.has(nodeId)) {
        return;
      }

      const node = graphNodes.find(n => n.id === nodeId);
      if (!node) {
        return;
      }

      visited.add(nodeId);

      // Add to current group if it's the start node or not a source-changing node
      if (nodeId === startNodeId || !isSourceChangingNode(node)) {
        currentGroup.add(nodeId);
      }

      // Process neighbors
      const neighbors = adjacencyList[nodeId] || [];
      for (const edge of neighbors) {
        const targetNode = graphNodes.find(n => n.id === edge.target);
        if (!targetNode) {
          continue;
        }

        if (isSourceChangingNode(targetNode)) {
          // Found a source-changing node, mark it for next processing
          nextSourceChangingNodes.add(targetNode.id);
        } else if (!visited.has(targetNode.id)) {
          dfs(targetNode.id);
        }
      }
    }

    // Start DFS from the start node
    dfs(startNodeId);

    // Save current group if not empty
    if (currentGroup.size > 0) {
      const groupNodes = graphNodes.filter(node => currentGroup.has(node.id));
      nodeGroups.push(groupNodes);
    }

    // Process next source-changing nodes
    nextSourceChangingNodes.forEach(nodeId => {
      if (!visited.has(nodeId)) {
        collectGroup(nodeId);
      }
    });
  }

  // Start from each source-changing node
  for (const node of graphNodes) {
    if (isSourceChangingNode(node) && !visited.has(node.id)) {
      collectGroup(node.id);
    }
  }

  return nodeGroups;
}
