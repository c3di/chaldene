import type { IGraph } from '../../src/tokens';

/** Minimal graph usable in every test. */
export function makeMinimalGraph(): IGraph {
  return {
    nodes: [
      {
        id: '0',
        position: { x: 0, y: 0 },
        data: { displayLabel: 'node', inputs: [], outputs: [] }
      }
    ],
    edges: []
  };
}

/** Two-node graph where node 1 feeds into node 2. */
export function makeTwoNodeGraph(): IGraph {
  return {
    nodes: [
      {
        id: '0',
        position: { x: 0, y: 0 },
        data: { displayLabel: 'source', inputs: [], outputs: [] }
      },
      {
        id: '1',
        position: { x: 200, y: 0 },
        data: { displayLabel: 'sink', inputs: [], outputs: [] }
      }
    ],
    edges: [
      { id: '0', source: '0', target: '1', sourceHandle: 'out0', targetHandle: 'in0' }
    ]
  };
}

export interface IMockContext {
  graph: IGraph;
  addGraphChangeListener: jest.Mock;
  newGraphInput: jest.Mock;
  action: jest.Mock;
  blockTriggerRunCode: boolean;
  /** Trigger registered graph-change listeners as if EditorContext.updateGraph fired. */
  _triggerGraphChange(graph: IGraph): void;
  /** The setValue mock captured from action('graph'). */
  _mockSetValue: jest.Mock;
}

/**
 * Minimal stand-in for EditorContext. Captures all listeners so tests can
 * trigger them manually via _triggerGraphChange.
 */
export function makeMockContext(graph?: IGraph): IMockContext {
  const graphListeners: Array<(g: IGraph) => void> = [];
  const mockSetValue = jest.fn();

  const ctx: IMockContext = {
    graph: graph ?? makeMinimalGraph(),
    blockTriggerRunCode: true,

    addGraphChangeListener: jest.fn((fn: (g: IGraph) => void) => {
      graphListeners.push(fn);
    }),

    newGraphInput: jest.fn((g: IGraph) => {
      ctx.graph = g;
    }),

    action: jest.fn((_name: string) => ({
      setValue: mockSetValue,
      checkExecutionReadiness: jest.fn(() => true)
    })),

    _mockSetValue: mockSetValue,

    _triggerGraphChange(g: IGraph): void {
      graphListeners.forEach(fn => fn(g));
    }
  };

  return ctx;
}
