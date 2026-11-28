import {
  importPWDToGraph,
  rehydratePWDNodeSpecs
} from '../../src/ReactVP/CodeGeneration/PWDImporter';
import { nodeSpecRegistry, getCodeGenerator } from '../../src/ReactVP/Spec';
import type EditorContext from '../../src/ReactVP/EditorContext';

function makeFakeEditorContext(): EditorContext {
  let nodeId = 0;
  let edgeId = 0;
  return {
    getNodeId: () => (nodeId++).toString(),
    getEdgeId: () => (edgeId++).toString()
  } as unknown as EditorContext;
}

const WORKFLOW_PY = `
def get_prod_and_div(x, y):
    return {"prod": x * y, "div": x / y}


def get_sum(x, y):
    return x + y
`;

const WORKFLOW_JSON = JSON.stringify({
  version: '0.1.0',
  nodes: [
    { id: 0, type: 'function', value: 'workflow.get_prod_and_div' },
    { id: 1, type: 'function', value: 'workflow.get_sum' },
    { id: 2, type: 'input', value: 1, name: 'x' },
    { id: 3, type: 'input', value: 2, name: 'y' },
    { id: 4, type: 'output', name: 'result' }
  ],
  edges: [
    { target: 0, targetPort: 'x', source: 2, sourcePort: null },
    { target: 0, targetPort: 'y', source: 3, sourcePort: null },
    { target: 1, targetPort: 'x', source: 0, sourcePort: 'prod' },
    { target: 1, targetPort: 'y', source: 0, sourcePort: 'div' },
    { target: 4, targetPort: null, source: 1, sourcePort: null }
  ]
});

/** Remove a spec's registry entry, simulating "never registered this session" -- i.e. a page reload. */
function forgetSpec(specName: string): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (nodeSpecRegistry as any).items[specName];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (nodeSpecRegistry as any).visualNodetypes[specName];
}

describe('PWD import/rehydration round-trip', () => {
  it('registers a working, self-contained spec for each imported node', () => {
    const graph = importPWDToGraph(
      WORKFLOW_JSON,
      WORKFLOW_PY,
      makeFakeEditorContext()
    );

    expect(graph.nodes).toHaveLength(2);
    graph.nodes.forEach(node => {
      const specName = node.data.specName as string;
      expect(node.data.pwdFunction).toBeDefined();
      expect(nodeSpecRegistry.get(specName)).toBeDefined();
      expect(nodeSpecRegistry.allVisualNodeTypes[specName]).toBeDefined();
    });
  });

  it('restores a node whose spec is gone after a simulated reload', () => {
    const graph = importPWDToGraph(
      WORKFLOW_JSON,
      WORKFLOW_PY,
      makeFakeEditorContext()
    );

    // Round-trip through JSON, the same way the graph is actually persisted
    // (editorContext is stripped before saving; see graphWithoutEditorContext).
    const reloadedGraph = JSON.parse(
      JSON.stringify(graph, (key, value) =>
        key === 'editorContext' ? undefined : value
      )
    );

    const node = reloadedGraph.nodes.find(
      (n: any) => n.data.pwdFunction.funcName === 'get_prod_and_div'
    );
    const specName = node.data.specName;
    forgetSpec(specName);
    expect(nodeSpecRegistry.get(specName)).toBeUndefined();

    rehydratePWDNodeSpecs(reloadedGraph);

    expect(nodeSpecRegistry.get(specName)).toBeDefined();
    expect(nodeSpecRegistry.allVisualNodeTypes[specName]).toBeDefined();

    // Not just re-registered -- the code generator actually works, producing
    // the same code it would have at the original import time.
    const generator = getCodeGenerator(specName, 'Python');
    expect(generator).not.toBeNull();
    const code = generator!(
      { x: 'in_x', y: 'in_y' },
      { prod: 'out_prod', div: 'out_div' }
    );
    expect(code).toContain('def get_prod_and_div(x, y):');
    expect(code).toContain('get_prod_and_div(in_x, in_y)');
    expect(code).toContain('out_prod = __get_prod_and_div_result["prod"]');
    expect(code).toContain('out_div = __get_prod_and_div_result["div"]');
  });

  it('does nothing when the spec is already registered', () => {
    const graph = importPWDToGraph(
      WORKFLOW_JSON,
      WORKFLOW_PY,
      makeFakeEditorContext()
    );
    const specName = graph.nodes[0].data.specName as string;
    const before = nodeSpecRegistry.get(specName);

    rehydratePWDNodeSpecs(graph);

    expect(nodeSpecRegistry.get(specName)).toBe(before);
  });

  it('does nothing for nodes without pwdFunction data (built-in nodes)', () => {
    const graph = {
      nodes: [
        {
          id: '0',
          position: { x: 0, y: 0 },
          data: { specName: 'skimage.threshold', displayLabel: 'Threshold' }
        }
      ],
      edges: []
    } as any;

    expect(() => rehydratePWDNodeSpecs(graph)).not.toThrow();
    expect(nodeSpecRegistry.get('skimage.threshold')).toBeUndefined();
  });
});
