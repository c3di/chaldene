import {
  type JupyterFrontEnd,
  type JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  INotebookTracker,
  INotebookWidgetFactory,
  NotebookActions,
  type NotebookPanel
} from '@jupyterlab/notebook';
import { CodeCell, Cell } from '@jupyterlab/cells';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IToolbarWidgetRegistry } from '@jupyterlab/apputils';
import executeCodeCell from './ExecuteCodeCell';
import { ContentFactory } from './ContentFactory';
import createCellTypeItem from './CreateCellTypeItem';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { defaultNodeSpecs } from './NodeSpec';
import { insertAbove, insertBelow } from './Action';
import { IChaldeneService } from './tokens';
import { ChaldeneService } from './ChaldeneService';
import { initChaldeneService } from './serviceRegistry';

const chaldeneVPCell: JupyterFrontEndPlugin<IChaldeneService> = {
  id: 'Chaldene: Add VP Cell',
  description: 'Visual Programming in JupyterLab for Image Processing',
  autoStart: true,
  provides: IChaldeneService,
  requires: [
    IToolbarWidgetRegistry,
    IEditorServices,
    INotebookWidgetFactory,
    INotebookTracker,
    IFileBrowserFactory
  ],
  activate: activateChaldeneVPCell
};

function activateChaldeneVPCell(
  app: JupyterFrontEnd,
  toolbarRegistry: IToolbarWidgetRegistry,
  editorServices: IEditorServices,
  notebookWidgetFactory: any,
  notebookTracker: INotebookTracker,
  fileBrowserFactory: IFileBrowserFactory
): IChaldeneService {
  const service = new ChaldeneService();
  initChaldeneService(service);
  // Expose for notebook %%javascript cells and browser console debugging.
  (window as any).__chaldene = service;
  // Add a new cell type to the toolbar
  const FACTORY = 'Notebook';
  toolbarRegistry.addFactory<NotebookPanel>(FACTORY, 'cellType', panel =>
    createCellTypeItem(panel)
  );

  const editorFactory = editorServices.factoryService.newInlineEditor;
  notebookWidgetFactory.contentFactory = new ContentFactory({
    editorFactory
  });

  CodeCell.execute = executeCodeCell;

  NotebookActions.insertBelow = insertBelow;
  NotebookActions.insertAbove = insertAbove;

  const fileBrowser = fileBrowserFactory.createFileBrowser('file-input', {
    restore: false
  });

  (Cell.prototype as any).getEditorOptions = function (): any {
    return {
      config: { ...this._editorConfig },
      extensions: this._editorExtensions,
      notebookTracker: notebookTracker,
      fileBrowser: fileBrowser
    };
  };

  defaultNodeSpecs();

  // Register a comm target so Python code can call the service directly
  // via ChaldeneClient without display(Javascript).
  const attachComm = (kernel: any) => registerCommTarget(kernel, service);
  notebookTracker.widgetAdded.connect((_, panel) => {
    panel.sessionContext.kernelChanged.connect((_: any, args: any) => {
      if (args.newValue) {
        attachComm(args.newValue);
      }
    });
    const kernel = (panel.sessionContext.session as any)?.kernel;
    if (kernel) {
      attachComm(kernel);
    }
  });
  notebookTracker.forEach(panel => {
    const kernel = (panel.sessionContext.session as any)?.kernel;
    if (kernel) {
      attachComm(kernel);
    }
  });

  return service;
}

function registerCommTarget(kernel: any, service: ChaldeneService): void {
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

const plugins: Array<JupyterFrontEndPlugin<any>> = [chaldeneVPCell];

export default plugins;
