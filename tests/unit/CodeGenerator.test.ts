import CodeGenerator from '../../src/ReactVP/CodeGeneration/CodeGenerator';
import { type Graph } from '../../src/ReactVP/Type';

function output(id: string) {
  return { id, name: id };
}

describe('CodeGenerator.codeForTerminalOutputs', () => {
  const generator = new CodeGenerator('python');

  it('returns empty string for a graph with no nodes', () => {
    const graph: Graph = { nodes: [], edges: [] };
    expect(generator.codeForTerminalOutputs('e0', graph)).toBe('');
  });

  it('displays the single unconsumed output of a linear chain', () => {
    // a -> b -> c, only c's output is unconsumed
    const graph: Graph = {
      nodes: [
        { id: 'a', data: { outputs: [output('out')] } } as any,
        { id: 'b', data: { outputs: [output('out')] } } as any,
        { id: 'c', data: { outputs: [output('out')] } } as any
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in'
        } as any,
        {
          id: 'e2',
          source: 'b',
          sourceHandle: 'out',
          target: 'c',
          targetHandle: 'in'
        } as any
      ]
    };

    const code = generator.codeForTerminalOutputs('e0', graph);
    expect(code).toBe('from IPython.display import display\ndisplay(e0_c_out)');
  });

  it('displays every unconsumed output when a node has multiple output ports', () => {
    // a has two outputs, "prod" is consumed by b, "div" is never consumed
    const graph: Graph = {
      nodes: [
        { id: 'a', data: { outputs: [output('prod'), output('div')] } } as any,
        { id: 'b', data: { outputs: [output('out')] } } as any
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          sourceHandle: 'prod',
          target: 'b',
          targetHandle: 'in'
        } as any
      ]
    };

    const code = generator.codeForTerminalOutputs('e0', graph);
    expect(code).toContain('display(e0_a_div)');
    expect(code).toContain('display(e0_b_out)');
    expect(code).not.toContain('e0_a_prod');
  });

  it('displays each branch of a graph with multiple independent leaf nodes', () => {
    // a feeds both b and c; neither b's nor c's output is consumed further
    const graph: Graph = {
      nodes: [
        { id: 'a', data: { outputs: [output('out')] } } as any,
        { id: 'b', data: { outputs: [output('out')] } } as any,
        { id: 'c', data: { outputs: [output('out')] } } as any
      ],
      edges: [
        {
          id: 'e1',
          source: 'a',
          sourceHandle: 'out',
          target: 'b',
          targetHandle: 'in'
        } as any,
        {
          id: 'e2',
          source: 'a',
          sourceHandle: 'out',
          target: 'c',
          targetHandle: 'in'
        } as any
      ]
    };

    const code = generator.codeForTerminalOutputs('e0', graph);
    expect(code).toContain('display(e0_b_out)');
    expect(code).toContain('display(e0_c_out)');
    expect(code).not.toContain('e0_a_out');
  });

  it('returns empty string when a node has no outputs', () => {
    const graph: Graph = {
      nodes: [{ id: 'a', data: {} } as any],
      edges: []
    };
    expect(generator.codeForTerminalOutputs('e0', graph)).toBe('');
  });
});
