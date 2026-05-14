import { ChaldeneService } from '../../src/ChaldeneService';
import {
  makeMockContext,
  makeMinimalGraph,
  makeTwoNodeGraph
} from '../__helpers__/makeMockContext';
import { waitForSignal } from '../__helpers__/waitForSignal';

describe('AsyncMount integration — timing', () => {
  let service: ChaldeneService;

  beforeEach(() => {
    service = new ChaldeneService();
  });

  it('setGraph before registration returns false', () => {
    expect(service.setGraph('cell-1', makeMinimalGraph())).toBe(false);
  });

  it('getGraph before registration returns undefined', () => {
    expect(service.getGraph('cell-1')).toBeUndefined();
  });

  it('run before registration does not throw', () => {
    expect(() => service.run('cell-1')).not.toThrow();
  });

  it('setGraph succeeds immediately after register is called', () => {
    service.register('cell-1', makeMockContext(), jest.fn());
    expect(service.setGraph('cell-1', makeMinimalGraph())).toBe(true);
  });

  it('cellReady signal lets a late caller apply a pending update', async () => {
    // Pattern: caller connects to cellReady before the cell exists, then
    // applies its update in the handler.
    const ctx = makeMockContext();
    const pendingGraph = makeTwoNodeGraph();

    const readyPromise = waitForSignal(service.cellReady);

    // Simulate async registration (would normally be triggered by rAF +
    // React mount completing inside VPWidget).
    setTimeout(() => {
      service.register('cell-1', ctx, jest.fn());
    }, 0);

    await readyPromise;

    const result = service.setGraph('cell-1', pendingGraph);
    expect(result).toBe(true);
    expect(ctx.newGraphInput).toHaveBeenCalledWith(pendingGraph);
  });

  it('multiple pending updates applied via cellReady are handled in order', async () => {
    const ctx = makeMockContext();

    const graph1 = makeMinimalGraph();
    const graph2 = makeTwoNodeGraph();

    service.cellReady.connect((_s, cellId) => {
      if (cellId === 'cell-1') {
        service.setGraph('cell-1', graph1);
        service.setGraph('cell-1', graph2);
      }
    });

    service.register('cell-1', ctx, jest.fn());

    expect(ctx.newGraphInput).toHaveBeenNthCalledWith(1, graph1);
    expect(ctx.newGraphInput).toHaveBeenNthCalledWith(2, graph2);
  });

  it('cellDisposed fires synchronously when deregister is called', () => {
    service.register('cell-1', makeMockContext(), jest.fn());

    const handler = jest.fn();
    service.cellDisposed.connect(handler);
    service.deregister('cell-1');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(service, 'cell-1');
  });

  it('service stays consistent through register → deregister → re-register', () => {
    const ctx1 = makeMockContext(makeMinimalGraph());
    const ctx2 = makeMockContext(makeTwoNodeGraph());

    service.register('cell-1', ctx1, jest.fn());
    expect(service.getGraph('cell-1')!.nodes).toHaveLength(1);

    service.deregister('cell-1');
    expect(service.isCellReady('cell-1')).toBe(false);

    service.register('cell-1', ctx2, jest.fn());
    expect(service.isCellReady('cell-1')).toBe(true);
    expect(service.getGraph('cell-1')!.nodes).toHaveLength(2);
  });
});
