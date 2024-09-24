import {
  type HandleUsageType,
  type IHandleIdentifier,
  type Graph
} from './Type';

export function isClickOnHandle(
  event: MouseEvent | React.MouseEvent<Element, MouseEvent> | undefined
): boolean {
  return (event?.target as HTMLElement).classList.contains(
    'react-flow__handle'
  );
}

export function isClickOnWidget(
  event: MouseEvent | React.MouseEvent<Element, MouseEvent> | undefined
): boolean {
  return (event?.target as HTMLElement).classList.contains('imageview');
}

export function getHandleIdentifier(
  event: MouseEvent | React.MouseEvent<Element, MouseEvent> | undefined
): IHandleIdentifier | null {
  const id = (event?.target as HTMLElement).dataset?.id;
  if (!id) {
    return null;
  }
  const [, nodeID, handleID, type] = id.split('-');
  return {
    nodeID,
    id: handleID,
    type: type as HandleUsageType
  };
}

export function getHandleRef(
  flowID: string,
  nodeID: string,
  handleID: string,
  type?: HandleUsageType
): HTMLElement | null {
  const types: HandleUsageType[] = type ? [type] : ['source', 'target'];
  for (const usageType of types) {
    const dataID = `${flowID}-${nodeID}-${handleID}-${usageType}`;
    const handle = document.querySelector<HTMLElement>(`[data-id="${dataID}"]`);
    if (handle) {
      return handle;
    }
  }
  return null;
}

export function getBoundingClientRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}

export function getCenterPosition(element: HTMLElement): {
  clientX: number;
  clientY: number;
} | null {
  const rect = element.getBoundingClientRect();
  return {
    clientX: rect.x + rect.width / 2,
    clientY: rect.y + rect.height / 2
  };
}

export function getNodeRef(
  nodeID: string,
  editorID?: string
): HTMLElement | null | undefined {
  const editor = editorID
    ? document.getElementById(editorID)
    : document.getElementById('react-flow');
  return editor?.querySelector<HTMLElement>(`[data-id="${nodeID}"]`);
}

export function graphToJSON(graph: Graph): string {
  return JSON.stringify(graphWithoutEditorContext(graph));
}

export function graphFromJSON(json: string): Graph {
  // todo: validate json is a graph
  return JSON.parse(json);
}

export function graphWithoutEditorContext(graph: Graph): Graph {
  return {
    nodes: graph.nodes.map(node => {
      const filteredData = { ...node.data };
      delete filteredData.editorContext;

      return {
        ...node,
        data: filteredData
      };
    }),
    edges: graph.edges
  };
}
