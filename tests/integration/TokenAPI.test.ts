import { ChaldeneService } from '../../src/ChaldeneService';
import {
  makeMockContext,
  makeMinimalGraph,
  makeTwoNodeGraph
} from '../__helpers__/makeMockContext';
import { waitForSignal } from '../__helpers__/waitForSignal';

describe('TokenAPI integration — lifecycle', () => {
  let service: ChaldeneService;

  beforeEach(() => {
    service = new ChaldeneService();
  });

  it('full lifecycle: register → setGraph → graphChanged → deregister', async () => {
    const ctx = makeMockContext(makeMinimalGraph());
    const runner = jest.fn();

    // 1. Register
    service.register('cell-1', ctx, runner);
    expect(service.isCellReady('cell-1')).toBe(true);

    // 2. Update graph via API
    const newGraph = makeTwoNodeGraph();
    const changed = waitForSignal(service.graphChanged);
    service.setGraph('cell-1', newGraph);
    expect(ctx.newGraphInput).toHaveBeenCalledWith(newGraph);

    // 3. Simulate the context propagating the change back to listeners
    ctx._triggerGraphChange(newGraph);
    const args = await changed;
    expect(args.cellId).toBe('cell-1');
    expect(args.graph.nodes).toHaveLength(2);

    // 4. Deregister
    const disposed = waitForSignal(service.cellDisposed);
    service.deregister('cell-1');
    expect(await disposed).toBe('cell-1');
    expect(service.isCellReady('cell-1')).toBe(false);
  });

  it('setGraph before cell is ready returns false', () => {
    const result = service.setGraph('cell-1', makeMinimalGraph());
    expect(result).toBe(false);
  });

  it('cellReady signal enables late callers to queue an update', async () => {
    const ctx = makeMockContext(makeMinimalGraph());

    // Simulate caller arriving before registration
    let applied = false;
    service.cellReady.connect((_sender, readyCellId) => {
      if (readyCellId === 'cell-1') {
        service.setGraph('cell-1', makeTwoNodeGraph());
        applied = true;
      }
    });

    service.register('cell-1', ctx, jest.fn());

    expect(applied).toBe(true);
    expect(ctx.newGraphInput).toHaveBeenCalledWith(
      expect.objectContaining({ nodes: expect.arrayContaining([expect.anything(), expect.anything()]) })
    );
  });

  it('two cells are independent — updating one does not affect the other', () => {
    const ctx1 = makeMockContext(makeMinimalGraph());
    const ctx2 = makeMockContext(makeMinimalGraph());
    service.register('cell-1', ctx1, jest.fn());
    service.register('cell-2', ctx2, jest.fn());

    service.setGraph('cell-1', makeTwoNodeGraph());

    expect(ctx1.newGraphInput).toHaveBeenCalledTimes(1);
    expect(ctx2.newGraphInput).not.toHaveBeenCalled();
  });

  it('run triggers only the correct cell runner', () => {
    const runner1 = jest.fn();
    const runner2 = jest.fn();
    service.register('cell-1', makeMockContext(), runner1);
    service.register('cell-2', makeMockContext(), runner2);

    service.run('cell-2');

    expect(runner2).toHaveBeenCalledTimes(1);
    expect(runner1).not.toHaveBeenCalled();
  });

  it('getReadyCellIds is empty after all cells deregister', () => {
    service.register('cell-1', makeMockContext(), jest.fn());
    service.register('cell-2', makeMockContext(), jest.fn());
    service.deregister('cell-1');
    service.deregister('cell-2');

    expect(service.getReadyCellIds()).toHaveLength(0);
  });
});
