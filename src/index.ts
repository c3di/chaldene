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

const chaldeneVPCell: JupyterFrontEndPlugin<void> = {
  id: 'Chaldene: Add VP Cell',
  description: 'Visual Programming in JupyterLab for Image Processing',
  autoStart: true,
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
) {
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
}

const plugins: Array<JupyterFrontEndPlugin<any>> = [chaldeneVPCell];

export default plugins;
