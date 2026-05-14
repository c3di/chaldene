import { Signal } from '@lumino/signaling';
import {
  type IChaldeneService,
  type IGraph,
  type IGraphChangedArgs
} from './tokens';
import { graphWithoutEditorContext } from './ReactVP/Utils';

interface CellEntry {
  context: any;
  run: () => void;
  graphListener: (graph: any) => void;
}

export class ChaldeneService implements IChaldeneService {
  private readonly _cells = new Map<string, CellEntry>();
  private readonly _cellReady = new Signal<this, string>(this);
  private readonly _cellDisposed = new Signal<this, string>(this);
  private readonly _graphChanged = new Signal<this, IGraphChangedArgs>(this);

  register(cellId: string, context: any, run: () => void): void {
    const existing = this._cells.get(cellId);
    if (existing) existing.context.removeGraphChangeListener(existing.graphListener);

    const graphListener = (graph: any) => {
      this._graphChanged.emit({
        cellId,
        graph: graphWithoutEditorContext(graph) as unknown as IGraph
      });
    };
    this._cells.set(cellId, { context, run, graphListener });
    context.addGraphChangeListener(graphListener);
    this._cellReady.emit(cellId);
  }

  deregister(cellId: string): void {
    const entry = this._cells.get(cellId);
    if (!entry) return;
    entry.context.removeGraphChangeListener(entry.graphListener);
    this._cells.delete(cellId);
    this._cellDisposed.emit(cellId);
  }

  isCellReady(cellId: string): boolean {
    return this._cells.has(cellId);
  }

  getReadyCellIds(): string[] {
    return Array.from(this._cells.keys());
  }

  getGraph(cellId: string): IGraph | undefined {
    const entry = this._cells.get(cellId);
    if (!entry?.context.graph) {
      return undefined;
    }
    return graphWithoutEditorContext(entry.context.graph) as unknown as IGraph;
  }

  setGraph(cellId: string, graph: IGraph): boolean {
    const entry = this._cells.get(cellId);
    if (!entry) {
      return false;
    }
    entry.context.newGraphInput(graph);
    return true;
  }

  setInputValue(
    cellId: string,
    nodeId: string,
    handleId: string,
    value: unknown
  ): boolean {
    const entry = this._cells.get(cellId);
    if (!entry) {
      return false;
    }
    entry.context.action('graph').setValue('inputs', { nodeID: nodeId, id: handleId }, value);
    return true;
  }

  run(cellId: string): boolean {
    const entry = this._cells.get(cellId);
    entry?.run();
    return entry !== undefined;
  }

  get cellReady(): Signal<this, string> {
    return this._cellReady;
  }

  get cellDisposed(): Signal<this, string> {
    return this._cellDisposed;
  }

  get graphChanged(): Signal<this, IGraphChangedArgs> {
    return this._graphChanged;
  }
}
