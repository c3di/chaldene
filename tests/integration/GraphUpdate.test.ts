import { ChaldeneService } from '../../src/ChaldeneService';
import {
  makeMockContext,
  makeMinimalGraph,
  makeTwoNodeGraph
} from '../__helpers__/makeMockContext';
import { waitForSignal } from '../__helpers__/waitForSignal';

describe('GraphUpdate integration', () => {
  let service: ChaldeneService;

  beforeEach(() => {
    service = new ChaldeneService();
  });

  describe('setGraph uses the newGraphInput path', () => {
    it('calls newGraphInput, not applyGraphChanges', () => {
      const ctx = makeMockContext();
      const mockApplyGraphChanges = jest.fn();
      (ctx as any).applyGraphChanges = mockApplyGraphChanges;
      service.register('cell-1', ctx, jest.fn());

      service.setGraph('cell-1', makeTwoNodeGraph());

      expect(ctx.newGraphInput).toHaveBeenCalledTimes(1);
      expect(mockApplyGraphChanges).not.toHaveBeenCalled();
    });
  });

  describe('graphChanged propagation', () => {
    it('graphChanged fires for each graph-change listener call', async () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      const results: any[] = [];
      service.graphChanged.connect((_s, args) => results.push(args));

      ctx._triggerGraphChange(makeMinimalGraph());
      ctx._triggerGraphChange(makeTwoNodeGraph());

      expect(results).toHaveLength(2);
      expect(results[0].graph.nodes).toHaveLength(1);
      expect(results[1].graph.nodes).toHaveLength(2);
    });

    it('graphChanged carries the cellId for each emission', async () => {
      const ctx1 = makeMockContext();
      const ctx2 = makeMockContext();
      service.register('cell-A', ctx1, jest.fn());
      service.register('cell-B', ctx2, jest.fn());

      const pending1 = waitForSignal(service.graphChanged);
      ctx1._triggerGraphChange(makeMinimalGraph());
      const args1 = await pending1;

      const pending2 = waitForSignal(service.graphChanged);
      ctx2._triggerGraphChange(makeTwoNodeGraph());
      const args2 = await pending2;

      expect(args1.cellId).toBe('cell-A');
      expect(args2.cellId).toBe('cell-B');
    });

    it('graphChanged emitted graph has editorContext stripped', async () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      const pending = waitForSignal(service.graphChanged);
      const graph = makeMinimalGraph();
      (graph.nodes[0].data as any).editorContext = { ref: {} };
      ctx._triggerGraphChange(graph);

      const { graph: emitted } = await pending;
      expect((emitted.nodes[0].data as any).editorContext).toBeUndefined();
    });
  });

  describe('setInputValue', () => {
    it('passes correct arguments to graph action setValue', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      service.setInputValue('cell-1', 'node-5', 'in2', 'hello');

      expect(ctx._mockSetValue).toHaveBeenCalledWith(
        'inputs',
        { nodeID: 'node-5', id: 'in2' },
        'hello'
      );
    });

    it('works with numeric, string, array, and object values', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());

      service.setInputValue('cell-1', 'n0', 'in0', 0);
      service.setInputValue('cell-1', 'n0', 'in1', 'text');
      service.setInputValue('cell-1', 'n0', 'in2', [10, 20]);
      service.setInputValue('cell-1', 'n0', 'in3', { w: 640, h: 480 });

      expect(ctx._mockSetValue).toHaveBeenCalledTimes(4);
    });
  });
});
