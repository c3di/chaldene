import { importPWDToGraph } from '../../src/ReactVP/CodeGeneration/PWDImporter';
import { getCodeGenerator } from '../../src/ReactVP/Spec';
import type EditorContext from '../../src/ReactVP/EditorContext';

function makeFakeEditorContext(): EditorContext {
  let nodeId = 0;
  let edgeId = 0;
  return {
    getNodeId: () => (nodeId++).toString(),
    getEdgeId: () => (edgeId++).toString()
  } as unknown as EditorContext;
}

// Reproduces the shape from testing-chaldene#6 (quantum_espresso workflow.json):
// a function's single `input_dict` argument is fed by a
// python_workflow_definition.shared.get_dict node, which bundles several
// named inputs -- not a function defined in workflow.py.
const WORKFLOW_PY = `
def calculate_qe(input_dict, working_directory="."):
    return {"energy": input_dict["smearing"]}
`;

const WORKFLOW_JSON = JSON.stringify({
  version: '0.1.0',
  nodes: [
    { id: 0, type: 'function', value: 'workflow.calculate_qe' },
    {
      id: 1,
      type: 'function',
      value: 'python_workflow_definition.shared.get_dict'
    },
    { id: 2, type: 'input', value: 0.02, name: 'smearing' },
    { id: 3, type: 'input', value: 'vc-relax', name: 'calculation' },
    { id: 4, type: 'input', value: 'mini', name: 'working_directory' },
    { id: 5, type: 'output', name: 'result' }
  ],
  edges: [
    { target: 1, targetPort: 'calculation', source: 3, sourcePort: null },
    { target: 1, targetPort: 'smearing', source: 2, sourcePort: null },
    { target: 0, targetPort: 'input_dict', source: 1, sourcePort: null },
    {
      target: 0,
      targetPort: 'working_directory',
      source: 4,
      sourcePort: null
    },
    { target: 5, targetPort: null, source: 0, sourcePort: null }
  ]
});

describe('PWD import of python_workflow_definition.shared helper nodes', () => {
  it('builds a visual node for get_dict and wires it to the consuming input', () => {
    const graph = importPWDToGraph(
      WORKFLOW_JSON,
      WORKFLOW_PY,
      makeFakeEditorContext()
    );

    // Both the get_dict glue node and calculate_qe must exist -- previously
    // get_dict was silently skipped (no entry in workflow.py), dropping this
    // edge and leaving calculate_qe's input_dict unconnected.
    expect(graph.nodes).toHaveLength(2);
    const getDictNode = graph.nodes.find(
      n => n.data.displayLabel === 'get_dict'
    );
    const calculateQeNode = graph.nodes.find(
      n => n.data.displayLabel === 'calculate_qe'
    );
    expect(getDictNode).toBeDefined();
    expect(calculateQeNode).toBeDefined();

    const inputDictHandle = calculateQeNode!.data.inputs?.find(
      h => h.name === 'input_dict'
    );
    const connectingEdge = graph.edges.find(
      e =>
        e.target === calculateQeNode!.id &&
        e.targetHandle === inputDictHandle!.id
    );
    expect(connectingEdge).toBeDefined();
    expect(connectingEdge!.source).toBe(getDictNode!.id);
  });

  it('generates a dict literal that bundles the named inputs correctly', () => {
    const graph = importPWDToGraph(
      WORKFLOW_JSON,
      WORKFLOW_PY,
      makeFakeEditorContext()
    );
    const getDictNode = graph.nodes.find(
      n => n.data.displayLabel === 'get_dict'
    )!;
    const generator = getCodeGenerator(getDictNode.data.specName, 'Python')!;

    const code = generator(
      { calculation: 'calc_in', smearing: 'smearing_in' },
      { result: 'bundled' }
    );
    expect(code).toBe(
      'bundled = {"calculation": calc_in, "smearing": smearing_in}'
    );
  });

  it('generates a correctly-ordered list literal for get_list, independent of edge order', () => {
    const graph = importPWDToGraph(
      JSON.stringify({
        version: '0.1.0',
        nodes: [
          {
            id: 0,
            type: 'function',
            value: 'python_workflow_definition.shared.get_list'
          },
          { id: 1, type: 'input', value: 1, name: 'a' },
          { id: 2, type: 'input', value: 2, name: 'b' },
          { id: 3, type: 'input', value: 3, name: 'c' },
          { id: 4, type: 'output', name: 'result' }
        ],
        // Deliberately out of positional order.
        edges: [
          { target: 0, targetPort: '2', source: 3, sourcePort: null },
          { target: 0, targetPort: '0', source: 1, sourcePort: null },
          { target: 0, targetPort: '1', source: 2, sourcePort: null },
          { target: 4, targetPort: null, source: 0, sourcePort: null }
        ]
      }),
      '',
      makeFakeEditorContext()
    );

    const node = graph.nodes[0];
    const generator = getCodeGenerator(node.data.specName, 'Python')!;
    const code = generator(
      { '0': 'first', '1': 'second', '2': 'third' },
      { result: 'bundled' }
    );
    expect(code).toBe('bundled = [first, second, third]');
  });
});
