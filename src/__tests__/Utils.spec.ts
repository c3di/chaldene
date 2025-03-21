import { findNodeGroupsBetweenSourceChangers } from '../ReactVP/Type/Utils';
import { type Graph } from '../ReactVP/Type/Graph';
import { type Node } from '../ReactVP/Type/Node';
import { type Edge } from '../ReactVP/Type/Edge';

describe('findNodeGroupsBetweenSourceChangers', () => {
  // Helper function to create a test node
  const createNode = (id: string, sourceChanged: boolean = false): Node => ({
    id,
    position: { x: 0, y: 0 },
    data: {
      name: 'test',
      specName: 'test',
      sourceChanged
    }
  });

  // Helper function to create an edge
  const createEdge = (source: string, target: string): Edge => ({
    id: `${source}-${target}`,
    source,
    target
  });

  it('should return empty array for empty graph', () => {
    const graph: Graph = {
      nodes: [],
      edges: []
    };

    const result = findNodeGroupsBetweenSourceChangers(graph);
    expect(result).toEqual([]);
  });

  it('should return empty array for graph with no source-changing nodes', () => {
    const graph: Graph = {
      nodes: [createNode('1'), createNode('2'), createNode('3')],
      edges: [createEdge('1', '2'), createEdge('2', '3')]
    };

    const result = findNodeGroupsBetweenSourceChangers(graph);
    expect(result).toEqual([]);
  });

  it('should group nodes between two source-changing nodes', () => {
    const graph: Graph = {
      nodes: [
        createNode('1', true),
        createNode('2'),
        createNode('3'),
        createNode('4', true),
        createNode('5')
      ],
      edges: [
        createEdge('1', '2'),
        createEdge('2', '3'),
        createEdge('3', '4'),
        createEdge('4', '5')
      ]
    };

    const result = findNodeGroupsBetweenSourceChangers(graph);
    expect(result).toHaveLength(2);
    expect(result[0].map(n => n.id)).toEqual(['1', '2', '3']);
    expect(result[1].map(n => n.id)).toEqual(['4', '5']);
  });

  it('should handle multiple branches between source-changing nodes', () => {
    const graph: Graph = {
      nodes: [
        createNode('1', true),
        createNode('2'),
        createNode('3'),
        createNode('4', true),
        createNode('5'),
        createNode('6'),
        createNode('7', true)
      ],
      edges: [
        createEdge('1', '2'),
        createEdge('1', '3'),
        createEdge('2', '4'),
        createEdge('3', '4'),
        createEdge('4', '5'),
        createEdge('4', '6'),
        createEdge('5', '7'),
        createEdge('6', '7')
      ]
    };

    const result = findNodeGroupsBetweenSourceChangers(graph);
    expect(result).toHaveLength(3);
    expect(result[0].map(n => n.id)).toEqual(['1', '2', '3']);
    expect(result[1].map(n => n.id)).toEqual(['4', '5', '6']);
    expect(result[2].map(n => n.id)).toEqual(['7']);
  });

  it('should handle disconnected components', () => {
    const graph: Graph = {
      nodes: [
        createNode('1', true),
        createNode('2'),
        createNode('3', true),
        createNode('4'),
        createNode('5', true)
      ],
      edges: [createEdge('1', '2'), createEdge('2', '3'), createEdge('4', '5')]
    };

    const result = findNodeGroupsBetweenSourceChangers(graph);
    expect(result).toHaveLength(3);
    expect(result[0].map(n => n.id)).toEqual(['1', '2']);
    expect(result[1].map(n => n.id)).toEqual(['3']);
    expect(result[2].map(n => n.id)).toEqual(['5']);
  });

  it('should handle single source-changing node', () => {
    const graph: Graph = {
      nodes: [createNode('1'), createNode('2', true), createNode('3')],
      edges: [createEdge('1', '2'), createEdge('2', '3')]
    };

    const result = findNodeGroupsBetweenSourceChangers(graph);
    expect(result).toHaveLength(1);
    expect(result[0].map(n => n.id)).toEqual(['2', '3']);
  });
});
