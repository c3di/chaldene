import PWDGenerator from '../../src/ReactVP/CodeGeneration/PWDGenerator';
import { importPWDToGraph } from '../../src/ReactVP/CodeGeneration/PWDImporter';
import { topologicalSortDAG } from '../../src/ReactVP/Type';
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

describe('PWDGenerator.pythonModule re-exporting a PWD-imported workflow', () => {
  it('emits each function once, without nesting it inside a duplicate of itself', () => {
    const graph = importPWDToGraph(
      WORKFLOW_JSON,
      WORKFLOW_PY,
      makeFakeEditorContext()
    );
    const nodes = topologicalSortDAG(graph);

    const { code } = new PWDGenerator().pythonModule(nodes);

    // Exactly one definition per function -- not one nested inside another.
    expect(code.match(/def get_prod_and_div\(/g)).toHaveLength(1);
    expect(code.match(/def get_sum\(/g)).toHaveLength(1);
    // No leftover PWD call-glue (the tmp result var, the manual dict unpack)
    // from the codeGenerator this now bypasses.
    expect(code).not.toContain('__get_prod_and_div_result');
    expect(code).toContain('return {"prod": x * y, "div": x / y}');
    expect(code).toContain('return x + y');
  });
});

describe('PWDGenerator.condaEnv', () => {
  it('extracts top-level module names from import lines and derives a minimal env', () => {
    const generator = new PWDGenerator();
    const yaml = generator.condaEnv(
      new Set([
        'import numpy as np',
        'import cv2',
        'from im2im import Image as IM, im2im'
      ])
    );

    expect(yaml).toContain('- numpy==2.2.4');
    expect(yaml).toContain('- opencv==4.11.0');
    expect(yaml).toContain('- pip:');
    expect(yaml).toContain('- im2im');
    expect(yaml).not.toContain('pyimagej');
    expect(yaml).not.toContain('pandas');
  });

  it('lists only python for a workflow with no third-party imports', () => {
    const generator = new PWDGenerator();
    const yaml = generator.condaEnv(new Set());

    expect(yaml).toContain('- python>=3.8');
    expect(yaml).not.toContain('pyimagej');
    expect(yaml).not.toContain('opencv');
    expect(yaml).not.toContain('im2im');
    expect(yaml).not.toContain('pip:');
  });

  it('round-trips the exact imports collected by pythonModule for the arithmetic example', () => {
    const graph = importPWDToGraph(
      WORKFLOW_JSON,
      WORKFLOW_PY,
      makeFakeEditorContext()
    );
    const nodes = topologicalSortDAG(graph);
    const generator = new PWDGenerator();

    const { moduleImports } = generator.pythonModule(nodes);
    const yaml = generator.condaEnv(
      new Set(
        [...moduleImports]
          .map(
            line =>
              /^(?:from|import)\s+([A-Za-z_][A-Za-z0-9_]*)/.exec(line)?.[1]
          )
          .filter((m): m is string => !!m)
      )
    );

    // Pure arithmetic: no scientific-stack imports at all, so none belong here.
    expect(yaml.trim()).toBe(
      `name: chaldene
channels:
  - conda-forge
  - defaults
dependencies:
  - python>=3.8`
    );
  });
});
