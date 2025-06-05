import { Graph } from './Graph';
import { Spec2Node } from '../Spec';

export function serializeGraph(graph: Graph): string {
  if (!graph) {
    return '';
  }
  const nodes = graph.nodes.map(node => ({
    id: node.id,
    specId: node.data.specName,
    position: node.position,
    inputs: node.data.inputs?.map(input => ({
      id: input.id,
      defaultValue: input.defaultValue,
      ...(input.widget && { widgetValue: input.widget.value })
    })),
    outputs: node.data.outputs?.map(output => ({
      id: output.id,
      defaultValue: output.defaultValue,
      ...(output.widget && { widgetValue: output.widget.value })
    }))
  }));
  const edges = graph.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle
  }));
  return JSON.stringify({ nodes, edges });
}

export function deserializeGraph(serializedGraph: string): Graph {
  if (!serializedGraph) {
    return { nodes: [], edges: [] };
  }
  const parsed = JSON.parse(serializedGraph);

  const nodes = parsed.nodes.map((node: any) => {
    const base = Spec2Node(node.specId, node.id, node.position);

    return {
      ...base,
      data: {
        ...base.data,
        inputs: base.data.inputs?.map((input: any) => {
          const override = node.inputs?.find((i: any) => i.id === input.id);
          return override
            ? {
                ...input,
                defaultValue: override.defaultValue,
                ...(input.widget
                  ? { widget: { ...input.widget, value: override.widgetValue } }
                  : {})
              }
            : input;
        }),
        outputs: base.data.outputs?.map((output: any) => {
          const override = node.outputs?.find((o: any) => o.id === output.id);
          return override
            ? {
                ...output,
                defaultValue: override.defaultValue,
                ...(output.widget
                  ? {
                      widget: { ...output.widget, value: override.widgetValue }
                    }
                  : {})
              }
            : output;
        })
      }
    };
  });

  const edges = parsed.edges.map((edge: any) => ({
    ...edge,
    markerEnd: {
      type: 'arrow',
      width: 30,
      height: 30
    },
    selected: false
  }));
  return { nodes, edges };
}
