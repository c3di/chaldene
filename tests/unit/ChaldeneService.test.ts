import { ChaldeneService } from '../../src/ChaldeneService';
import {
  makeMockContext,
  makeMinimalGraph,
  makeTwoNodeGraph
} from '../__helpers__/makeMockContext';
import { waitForSignal } from '../__helpers__/waitForSignal';

describe('ChaldeneService', () => {
  let service: ChaldeneService;

  beforeEach(() => {
    service = new ChaldeneService();
  });

  describe('registration', () => {
    it('isCellReady returns false for an unknown cell', () => {
      expect(service.isCellReady('unknown')).toBe(false);
    });

    it('register makes the cell ready', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      expect(service.isCellReady('cell-1')).toBe(true);
    });

    it('register emits cellReady with the cell ID', async () => {
      const pending = waitForSignal(service.cellReady);
      service.register('cell-1', makeMockContext(), jest.fn());
      expect(await pending).toBe('cell-1');
    });

    it('getReadyCellIds reflects current registrations', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      service.register('cell-2', makeMockContext(), jest.fn());
      expect(service.getReadyCellIds()).toEqual(
        expect.arrayContaining(['cell-1', 'cell-2'])
      );
      expect(service.getReadyCellIds()).toHaveLength(2);
    });

    it('deregister removes the cell', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      service.deregister('cell-1');
      expect(service.isCellReady('cell-1')).toBe(false);
    });

    it('deregister emits cellDisposed with the cell ID', async () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      const pending = waitForSignal(service.cellDisposed);
      service.deregister('cell-1');
      expect(await pending).toBe('cell-1');
    });

    it('deregister removes the cell from getReadyCellIds', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      service.register('cell-2', makeMockContext(), jest.fn());
      service.deregister('cell-1');
      expect(service.getReadyCellIds()).toEqual(['cell-2']);
    });

    it('registering the same cell ID twice removes the old listener and attaches the new one', () => {
      const ctx1 = makeMockContext();
      const ctx2 = makeMockContext();
      service.register('cell-1', ctx1, jest.fn());
      service.register('cell-1', ctx2, jest.fn());

      // Old listener removed from ctx1
      expect(ctx1.removeGraphChangeListener).toHaveBeenCalledTimes(1);

      // cellReady fired twice, cell still present once
      expect(service.isCellReady('cell-1')).toBe(true);
      expect(service.getReadyCellIds()).toHaveLength(1);

      // ctx1 no longer drives graphChanged
      const handler = jest.fn();
      service.graphChanged.connect(handler);
      ctx1._triggerGraphChange(makeMinimalGraph());
      expect(handler).not.toHaveBeenCalled();

      // ctx2 does
      ctx2._triggerGraphChange(makeMinimalGraph());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('deregister on an unknown cell ID does not emit cellDisposed', () => {
      const handler = jest.fn();
      service.cellDisposed.connect(handler);

      service.deregister('never-registered');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getGraph', () => {
    it('returns undefined for an unknown cell', () => {
      expect(service.getGraph('unknown')).toBeUndefined();
    });

    it('returns undefined when context has no graph yet', () => {
      const ctx = makeMockContext();
      ctx.graph = undefined as any;
      service.register('cell-1', ctx, jest.fn());
      expect(service.getGraph('cell-1')).toBeUndefined();
    });

    it('returns the current graph shape', () => {
      const graph = makeTwoNodeGraph();
      const ctx = makeMockContext(graph);
      service.register('cell-1', ctx, jest.fn());

      const result = service.getGraph('cell-1');
      expect(result).toBeDefined();
      expect(result!.nodes).toHaveLength(2);
      expect(result!.edges).toHaveLength(1);
    });

    it('returns a copy — mutating it does not affect the stored graph', () => {
      const graph = makeMinimalGraph();
      const ctx = makeMockContext(graph);
      service.register('cell-1', ctx, jest.fn());

      const copy = service.getGraph('cell-1')!;
      copy.nodes.push({ id: 'extra', position: { x: 0, y: 0 }, data: {} });

      expect(service.getGraph('cell-1')!.nodes).toHaveLength(1);
    });

    it('strips editorContext from node data', () => {
      const graph = makeMinimalGraph();
      (graph.nodes[0].data as any).editorContext = { internal: true };
      const ctx = makeMockContext(graph);
      service.register('cell-1', ctx, jest.fn());

      const result = service.getGraph('cell-1')!;
      expect((result.nodes[0].data as any).editorContext).toBeUndefined();
    });
  });

  describe('setGraph', () => {
    it('returns false for an unknown cell', () => {
      expect(service.setGraph('unknown', makeMinimalGraph())).toBe(false);
    });

    it('returns true for a known cell', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      expect(service.setGraph('cell-1', makeMinimalGraph())).toBe(true);
    });

    it('calls context.newGraphInput with the supplied graph', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      const graph = makeTwoNodeGraph();
      service.setGraph('cell-1', graph);

      expect(ctx.newGraphInput).toHaveBeenCalledWith(graph);
    });

    it('does not call newGraphInput on any other registered cell', () => {
      const ctx1 = makeMockContext();
      const ctx2 = makeMockContext();
      service.register('cell-1', ctx1, jest.fn());
      service.register('cell-2', ctx2, jest.fn());

      service.setGraph('cell-1', makeMinimalGraph());

      expect(ctx2.newGraphInput).not.toHaveBeenCalled();
    });
  });

  describe('setInputValue', () => {
    it('returns false for an unknown cell', () => {
      expect(service.setInputValue('unknown', 'n0', 'in0', 42)).toBe(false);
    });

    it('returns true for a known cell', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      expect(service.setInputValue('cell-1', 'n0', 'in0', 42)).toBe(true);
    });

    it('calls action(graph).setValue with the correct arguments', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      service.setInputValue('cell-1', 'n0', 'in0', 99);

      expect(ctx.action).toHaveBeenCalledWith('graph');
      expect(ctx._mockSetValue).toHaveBeenCalledWith(
        'inputs',
        { nodeID: 'n0', id: 'in0' },
        99
      );
    });

    it('accepts any value type', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      service.setInputValue('cell-1', 'n0', 'in0', 'hello');
      service.setInputValue('cell-1', 'n0', 'in1', [1, 2, 3]);
      service.setInputValue('cell-1', 'n0', 'in2', { nested: true });

      expect(ctx._mockSetValue).toHaveBeenCalledTimes(3);
    });
  });

  describe('run', () => {
    it('calls the registered runner and returns true for a known cell', () => {
      const runner = jest.fn();
      service.register('cell-1', makeMockContext(), runner);

      expect(service.run('cell-1')).toBe(true);
      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('returns false for an unknown cell', () => {
      expect(service.run('unknown')).toBe(false);
    });

    it('calls only the correct runner when multiple cells are registered', () => {
      const runner1 = jest.fn();
      const runner2 = jest.fn();
      service.register('cell-1', makeMockContext(), runner1);
      service.register('cell-2', makeMockContext(), runner2);

      service.run('cell-1');

      expect(runner1).toHaveBeenCalledTimes(1);
      expect(runner2).not.toHaveBeenCalled();
    });
  });

  describe('graphChanged signal', () => {
    it('fires when a context graph-change listener is triggered', async () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      const pending = waitForSignal(service.graphChanged);
      ctx._triggerGraphChange(makeTwoNodeGraph());

      const args = await pending;
      expect(args.cellId).toBe('cell-1');
      expect(args.graph.nodes).toHaveLength(2);
    });

    it('strips editorContext from the emitted graph', async () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      const pending = waitForSignal(service.graphChanged);
      const graph = makeMinimalGraph();
      (graph.nodes[0].data as any).editorContext = { internal: true };
      ctx._triggerGraphChange(graph);

      const args = await pending;
      expect((args.graph.nodes[0].data as any).editorContext).toBeUndefined();
    });

    it('includes the correct cellId when multiple cells are registered', async () => {
      const ctx1 = makeMockContext();
      const ctx2 = makeMockContext();
      service.register('cell-1', ctx1, jest.fn());
      service.register('cell-2', ctx2, jest.fn());

      const pending = waitForSignal(service.graphChanged);
      ctx2._triggerGraphChange(makeMinimalGraph());

      const args = await pending;
      expect(args.cellId).toBe('cell-2');
    });

    it('does not fire after the cell is deregistered', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());
      service.deregister('cell-1');

      const handler = jest.fn();
      service.graphChanged.connect(handler);

      ctx._triggerGraphChange(makeMinimalGraph());

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
