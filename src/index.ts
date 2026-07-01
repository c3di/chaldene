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
import { IFileBrowserFactory, FileDialog } from '@jupyterlab/filebrowser';
import { defaultNodeSpecs } from './NodeSpec';
import { insertAbove, insertBelow } from './Action';
import { runZenodoPublishFlow } from './ZenodoPublishFlow';

const PUBLISH_TO_ZENODO_COMMAND = 'chaldene:publish-to-zenodo';

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

  // Add a "Publish to Zenodo" entry to the file browser context menu (shown when
  // right-clicking the empty area of the browser). Rather than relying on the
  // current selection, it opens a dialog so the user can pick multiple files.
  app.commands.addCommand(PUBLISH_TO_ZENODO_COMMAND, {
    label: 'Publish to Zenodo',
    caption:
      'Select one or more files/folders to upload to Zenodo (zenodo.org) and mint a DOI',
    execute: async () => {
      const manager =
        fileBrowserFactory.tracker.currentWidget?.model.manager ??
        fileBrowser.model.manager;
      const result = await FileDialog.getOpenFiles({
        manager,
        title: 'Select files or folders to publish to Zenodo',
        filter: () => ({ score: 1 })
      });
      if (!result.button.accept || !result.value) {
        return;
      }
      const paths = result.value.map(item => item.path);
      if (paths.length === 0) {
        return;
      }
      await runZenodoPublishFlow(paths);
    }
  });
  app.contextMenu.addItem({
    command: PUBLISH_TO_ZENODO_COMMAND,
    // The empty area (and background) of the file browser listing.
    selector: '.jp-DirListing-content',
    rank: 10
  });

  defaultNodeSpecs();
}

const plugins: Array<JupyterFrontEndPlugin<any>> = [chaldeneVPCell];

export default plugins;
