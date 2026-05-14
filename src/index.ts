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
import { initChaldeneService, registerCommTargetOnKernel } from './serviceRegistry';

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
  // Use a WeakSet to avoid double-registering the same kernel instance.
  const attachFromPanel = (panel: any) => {
    const tryNow = () => {
      const kernel = (panel.sessionContext.session as any)?.kernel;
      if (kernel) registerCommTargetOnKernel(kernel);
    };
    tryNow();
    // sessionContext.ready resolves once the kernel is fully connected —
    // more reliable than checking session?.kernel at widgetAdded time.
    void (panel.sessionContext.ready as Promise<void>).then(tryNow);
    panel.sessionContext.kernelChanged.connect((_: any, args: any) => {
      if (args.newValue) registerCommTargetOnKernel(args.newValue);
    });
  };
  notebookTracker.widgetAdded.connect((_, panel) => attachFromPanel(panel));
  notebookTracker.forEach((panel: any) => attachFromPanel(panel));

  return service;
}


const plugins: Array<JupyterFrontEndPlugin<any>> = [chaldeneVPCell];

export default plugins;
