import type { ChaldeneService } from './ChaldeneService';

let _service: ChaldeneService | null = null;

// Tracks kernels that already have the comm target registered so we don't
// duplicate signal subscriptions across repeated calls.
const _registeredKernels = new WeakSet<object>();

export function initChaldeneService(service: ChaldeneService): void {
  _service = service;
}

export function getChaldeneService(): ChaldeneService | null {
  return _service;
}

// Called from both activation (index.ts) and every cell execution (ExecuteCodeCell.ts)
// so the target is guaranteed present before Python code runs ChaldeneClient().
export function registerCommTargetOnKernel(kernel: any): void {
  if (!_service) {
    console.warn('[chaldene] registerCommTargetOnKernel: service not initialised');
    return;
  }
  if (!kernel || _registeredKernels.has(kernel)) return;
  _registeredKernels.add(kernel);

  const service = _service;
  kernel.registerCommTarget('chaldene:api', (comm: any, _openMsg: any) => {
    comm.send({ type: 'init', cellIds: service.getReadyCellIds() });

    const onCellReady = (_: any, cellId: string) => {
      comm.send({ type: 'cell_ready', cellId });
    };
    const onCellDisposed = (_: any, cellId: string) => {
      comm.send({ type: 'cell_disposed', cellId });
    };
    service.cellReady.connect(onCellReady);
    service.cellDisposed.connect(onCellDisposed);

    comm.onMsg = (msg: any) => {
      const d = msg.content.data;
      switch (d.action) {
        case 'run':
          service.run(d.cellId);
          break;
        case 'setInputValue':
          service.setInputValue(d.cellId, d.nodeId, d.handleId, d.value);
          break;
        case 'setGraph':
          service.setGraph(d.cellId, d.graph);
          break;
      }
    };

    comm.onClose = () => {
      service.cellReady.disconnect(onCellReady);
      service.cellDisposed.disconnect(onCellDisposed);
    };
  });
}
