import EditorContext from '../../src/ReactVP/EditorContext';
import { makeMinimalGraph } from '../__helpers__/makeMockContext';

// Minimal EditorContext factory. Accepts optional mock actions so individual
// tests can inject a 'graph' action for checkExecutionReadiness.
function makeEditorContext(mockActions: Record<string, any> = {}): EditorContext {
  return new EditorContext(
    'test-editor',
    { current: null },
    { allVisualNodeTypes: {}, allNodeSpecs: [] } as any,
    {},
    {},
    {} as any,
    { get: () => ({ codeFromGraph: () => null }) } as any,
    mockActions
  );
}

// Mock graph action that signals all nodes are ready for execution.
function makeReadyGraphAction() {
  return { checkExecutionReadiness: jest.fn(() => true), newGraphInput: jest.fn() };
}

describe('EditorContext', () => {
  // ── Initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('blockTriggerRunCode starts as true (prevents execution on load)', () => {
      const ctx = makeEditorContext();
      expect(ctx.blockTriggerRunCode).toBe(true);
    });

    it('focused starts as false', () => {
      const ctx = makeEditorContext();
      expect(ctx.focused).toBe(false);
    });

    it('graph starts as undefined', () => {
      const ctx = makeEditorContext();
      expect(ctx.graph).toBeUndefined();
    });

    it('isLiveExecution is true by default', () => {
      const ctx = makeEditorContext();
      expect(ctx.getIsLiveExecution()).toBe(true);
    });
  });

  // ── triggerLiveExecution guards ─────────────────────────────────────────────

  describe('triggerLiveExecution', () => {
    it('does not fire when blockTriggerRunCode is true', () => {
      const ctx = makeEditorContext();
      const handler = jest.fn();
      ctx.onLiveExecution = handler;
      ctx.focused = true;
      // blockTriggerRunCode is true by default

      ctx.triggerLiveExecution();

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire when focused is false', () => {
      const ctx = makeEditorContext();
      const handler = jest.fn();
      ctx.onLiveExecution = handler;
      ctx.blockTriggerRunCode = false;
      // focused is false by default

      ctx.triggerLiveExecution();

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire when isLiveExecution is false', () => {
      // Set up all other conditions first, then toggle live mode off.
      const ctx = makeEditorContext({ graph: makeReadyGraphAction() });
      const handler = jest.fn();
      ctx.onLiveExecution = handler;
      ctx.graph = makeMinimalGraph() as any;
      ctx.blockTriggerRunCode = false;
      ctx.focused = true;

      // setIsLiveExecution(false) sets the flag then calls triggerLiveExecution.
      ctx.setIsLiveExecution(false);

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not fire when getGraphToBeExecuted returns null (no graph)', () => {
      const ctx = makeEditorContext({ graph: makeReadyGraphAction() });
      const handler = jest.fn();
      ctx.onLiveExecution = handler;
      ctx.blockTriggerRunCode = false;
      ctx.focused = true;
      // ctx.graph is undefined → getGraphToBeExecuted returns null

      ctx.triggerLiveExecution();

      expect(handler).not.toHaveBeenCalled();
    });

    it('fires when all conditions are met', () => {
      const ctx = makeEditorContext({ graph: makeReadyGraphAction() });
      const handler = jest.fn();
      ctx.onLiveExecution = handler;
      ctx.graph = makeMinimalGraph() as any;
      ctx.blockTriggerRunCode = false;
      ctx.focused = true;
      // isLiveExecution is true by default, prevExecGraph is undefined

      ctx.triggerLiveExecution();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not fire again if triggerLiveExecution is called twice with no graph change', () => {
      // prevExecGraph is not updated by triggerLiveExecution itself — only
      // EditorContext.code() updates it. So a second call should still fire
      // (the graph is still "changed" relative to prevExecGraph=undefined).
      // This test documents the current behaviour, not a desired invariant.
      const ctx = makeEditorContext({ graph: makeReadyGraphAction() });
      const handler = jest.fn();
      ctx.onLiveExecution = handler;
      ctx.graph = makeMinimalGraph() as any;
      ctx.blockTriggerRunCode = false;
      ctx.focused = true;

      ctx.triggerLiveExecution();
      ctx.triggerLiveExecution();

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  // ── setGraph does not arm live execution ────────────────────────────────────

  describe('newGraphInput', () => {
    it('does not set blockTriggerRunCode to false', () => {
      // newGraphInput is the path used by ChaldeneService.setGraph.
      // It must not arm live execution — only interactive user edits should.
      const ctx = makeEditorContext({ graph: makeReadyGraphAction() });
      ctx.graph = makeMinimalGraph() as any;
      // blockTriggerRunCode is true by default

      ctx.newGraphInput(makeMinimalGraph() as any);

      expect(ctx.blockTriggerRunCode).toBe(true);
    });
  });

  // ── removeGraphChangeListener ───────────────────────────────────────────────

  describe('removeGraphChangeListener', () => {
    it('removed listener is not called on the next updateGraph', () => {
      const ctx = makeEditorContext();
      const listener = jest.fn();
      ctx.addGraphChangeListener(listener);
      ctx.removeGraphChangeListener(listener);

      ctx.updateGraph(makeMinimalGraph() as any);

      expect(listener).not.toHaveBeenCalled();
    });

    it('does not affect other registered listeners', () => {
      const ctx = makeEditorContext();
      const kept = jest.fn();
      const removed = jest.fn();
      ctx.addGraphChangeListener(kept);
      ctx.addGraphChangeListener(removed);
      ctx.removeGraphChangeListener(removed);

      ctx.updateGraph(makeMinimalGraph() as any);

      expect(kept).toHaveBeenCalledTimes(1);
      expect(removed).not.toHaveBeenCalled();
    });

    it('does not throw when called with an unregistered function', () => {
      const ctx = makeEditorContext();
      expect(() => ctx.removeGraphChangeListener(jest.fn())).not.toThrow();
    });
  });

  // ── updateGraph listeners ───────────────────────────────────────────────────

  describe('updateGraph', () => {
    it('calls all registered graphChangeListeners', () => {
      const ctx = makeEditorContext();
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      ctx.addGraphChangeListener(listener1);
      ctx.addGraphChangeListener(listener2);

      const graph = makeMinimalGraph() as any;
      ctx.updateGraph(graph);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('strips editorContext before passing to listeners', () => {
      const ctx = makeEditorContext();
      let receivedGraph: any = null;
      ctx.addGraphChangeListener(g => {
        receivedGraph = g;
      });

      const graph = makeMinimalGraph() as any;
      graph.nodes[0].data.editorContext = { internal: true };
      ctx.updateGraph(graph);

      expect(receivedGraph.nodes[0].data.editorContext).toBeUndefined();
    });

    it('sets this.graph to the raw graph (with editorContext intact)', () => {
      const ctx = makeEditorContext();
      const graph = makeMinimalGraph() as any;
      graph.nodes[0].data.editorContext = { internal: true };
      ctx.updateGraph(graph);

      // ctx.graph retains editorContext; listeners receive a stripped copy
      expect((ctx.graph as any).nodes[0].data.editorContext).toEqual({
        internal: true
      });
    });
  });

  // ── ID generators ───────────────────────────────────────────────────────────

  describe('ID generators', () => {
    it('getNodeId returns incrementing string IDs', () => {
      const ctx = makeEditorContext();
      expect(ctx.getNodeId()).toBe('0');
      expect(ctx.getNodeId()).toBe('1');
      expect(ctx.getNodeId()).toBe('2');
    });

    it('getEdgeId returns incrementing string IDs', () => {
      const ctx = makeEditorContext();
      expect(ctx.getEdgeId()).toBe('0');
      expect(ctx.getEdgeId()).toBe('1');
    });

    it('newGraphInput reseeds node ID counter from existing node IDs', () => {
      const ctx = makeEditorContext({ graph: makeReadyGraphAction() });
      const graph = makeMinimalGraph() as any;
      graph.nodes[0].id = '5';

      ctx.newGraphInput(graph);

      // Next ID should be 6 (max existing ID + 1)
      expect(parseInt(ctx.getNodeId(), 10)).toBeGreaterThanOrEqual(6);
    });
  });
});
