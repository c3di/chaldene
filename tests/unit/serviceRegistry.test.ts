import { initChaldeneService, registerCommTargetOnKernel } from '../../src/serviceRegistry';
import { ChaldeneService } from '../../src/ChaldeneService';
import { makeMockContext } from '../__helpers__/makeMockContext';

function makeMockKernel() {
  const handlers: Record<string, (comm: any, openMsg: any) => void> = {};
  return {
    registerCommTarget: jest.fn((target: string, handler: (comm: any, openMsg: any) => void) => {
      handlers[target] = handler;
    }),
    openComm(target = 'chaldene:api') {
      const handler = handlers[target];
      if (!handler) throw new Error(`No handler registered for target '${target}'`);
      const comm = makeMockComm();
      handler(comm, {});
      return comm;
    }
  };
}

function makeMockComm() {
  const comm = {
    send: jest.fn(),
    onMsg: null as ((msg: any) => void) | null,
    onClose: null as (() => void) | null,
    receive(data: any) { comm.onMsg?.({ content: { data } }); },
    close() { comm.onClose?.(); }
  };
  return comm;
}

describe('serviceRegistry', () => {
  let service: ChaldeneService;

  beforeEach(() => {
    service = new ChaldeneService();
    initChaldeneService(service);
  });

  // ── Kernel registration ─────────────────────────────────────────────────────

  describe('registerCommTargetOnKernel', () => {
    it('registers the chaldene:api target on the kernel', () => {
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      expect(kernel.registerCommTarget).toHaveBeenCalledWith('chaldene:api', expect.any(Function));
    });

    it('does not register the same kernel twice', () => {
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      registerCommTargetOnKernel(kernel);
      expect(kernel.registerCommTarget).toHaveBeenCalledTimes(1);
    });

    it('registers two different kernel objects independently', () => {
      const kernel1 = makeMockKernel();
      const kernel2 = makeMockKernel();
      registerCommTargetOnKernel(kernel1);
      registerCommTargetOnKernel(kernel2);
      expect(kernel1.registerCommTarget).toHaveBeenCalledTimes(1);
      expect(kernel2.registerCommTarget).toHaveBeenCalledTimes(1);
    });

    it('does nothing when kernel is null', () => {
      expect(() => registerCommTargetOnKernel(null)).not.toThrow();
    });

    it('does nothing when service is not initialised', () => {
      initChaldeneService(null as any);
      const kernel = makeMockKernel();
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(() => registerCommTargetOnKernel(kernel)).not.toThrow();
      expect(kernel.registerCommTarget).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  // ── comm_open: init message ─────────────────────────────────────────────────

  describe('comm_open', () => {
    it('sends init with empty cellIds when no cells are registered', () => {
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();
      expect(comm.send).toHaveBeenCalledWith({ type: 'init', cellIds: [] });
    });

    it('sends init with current ready cell IDs', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();
      expect(comm.send).toHaveBeenCalledWith({ type: 'init', cellIds: ['cell-1'] });
    });
  });

  // ── Push events ─────────────────────────────────────────────────────────────

  describe('push events', () => {
    it('sends cell_ready when a cell registers after comm_open', () => {
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();
      comm.send.mockClear();

      service.register('cell-1', makeMockContext(), jest.fn());

      expect(comm.send).toHaveBeenCalledWith({ type: 'cell_ready', cellId: 'cell-1' });
    });

    it('sends cell_disposed when a cell deregisters', () => {
      service.register('cell-1', makeMockContext(), jest.fn());
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();
      comm.send.mockClear();

      service.deregister('cell-1');

      expect(comm.send).toHaveBeenCalledWith({ type: 'cell_disposed', cellId: 'cell-1' });
    });

    it('stops sending events after comm.onClose', () => {
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();
      comm.close();
      comm.send.mockClear();

      service.register('cell-1', makeMockContext(), jest.fn());

      expect(comm.send).not.toHaveBeenCalled();
    });
  });

  // ── Incoming actions ────────────────────────────────────────────────────────

  describe('incoming actions', () => {
    it('run action calls service.run with the cell ID', () => {
      const runner = jest.fn();
      service.register('cell-1', makeMockContext(), runner);
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();

      comm.receive({ action: 'run', cellId: 'cell-1' });

      expect(runner).toHaveBeenCalledTimes(1);
    });

    it('setInputValue action calls service.setInputValue with correct arguments', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();

      comm.receive({ action: 'setInputValue', cellId: 'cell-1', nodeId: 'n0', handleId: 'in0', value: 42 });

      expect(ctx._mockSetValue).toHaveBeenCalledWith('inputs', { nodeID: 'n0', id: 'in0' }, 42);
    });

    it('setGraph action calls service.setGraph with the provided graph', () => {
      const ctx = makeMockContext();
      service.register('cell-1', ctx, jest.fn());
      const kernel = makeMockKernel();
      registerCommTargetOnKernel(kernel);
      const comm = kernel.openComm();

      const graph = { nodes: [], edges: [] };
      comm.receive({ action: 'setGraph', cellId: 'cell-1', graph });

      expect(ctx.newGraphInput).toHaveBeenCalledWith(graph);
    });
  });
});
