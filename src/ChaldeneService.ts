import { Signal } from '@lumino/signaling';
import {
  type IChaldeneService,
  type IGraph,
  type IGraphChangedArgs
} from './tokens';
import { graphWithoutEditorContext } from './ReactVP/Utils';

export class ChaldeneService implements IChaldeneService {
  private readonly _cells = new Map<string, any>();
  private readonly _runners = new Map<string, () => void>();
  private readonly _cellReady = new Signal<this, string>(this);
  private readonly _cellDisposed = new Signal<this, string>(this);
  private readonly _graphChanged = new Signal<this, IGraphChangedArgs>(this);

  // ── Internal registration (called by VPWidget) ──────────────────────────────

  register(cellId: string, context: any, run: () => void): void {
    this._cells.set(cellId, context);
    this._runners.set(cellId, run);

    context.addGraphChangeListener((graph: any) => {
      this._graphChanged.emit({
        cellId,
        graph: graphWithoutEditorContext(graph) as unknown as IGraph
      });
    });

    this._cellReady.emit(cellId);
  }

  deregister(cellId: string): void {
    this._cells.delete(cellId);
    this._runners.delete(cellId);
    this._cellDisposed.emit(cellId);
  }

  // ── IChaldeneService ────────────────────────────────────────────────────────

  isCellReady(cellId: string): boolean {
    return this._cells.has(cellId);
  }

  getReadyCellIds(): string[] {
    return Array.from(this._cells.keys());
  }

  getGraph(cellId: string): IGraph | undefined {
    const context = this._cells.get(cellId);
    if (!context?.graph) {
      return undefined;
    }
    return graphWithoutEditorContext(context.graph) as unknown as IGraph;
  }

  setGraph(cellId: string, graph: IGraph): boolean {
    const context = this._cells.get(cellId);
    if (!context) {
      return false;
    }
    context.newGraphInput(graph);
    return true;
  }

  setInputValue(
    cellId: string,
    nodeId: string,
    handleId: string,
    value: unknown
  ): boolean {
    const context = this._cells.get(cellId);
    if (!context) {
      return false;
    }
    context.action('graph').setValue('inputs', { nodeID: nodeId, id: handleId }, value);
    return true;
  }

  run(cellId: string): void {
    this._runners.get(cellId)?.();
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
