
import {
  // ILabShell,
  type JupyterFrontEnd,
  type JupyterFrontEndPlugin,
} from '@jupyterlab/application';
import {
  INotebookWidgetFactory,
  type NotebookPanel,
} from '@jupyterlab/notebook';
import { CodeCell } from '@jupyterlab/cells';
import { IEditorServices } from '@jupyterlab/codeeditor';
import { IToolbarWidgetRegistry } from '@jupyterlab/apputils';
// import { VPNotebook } from './VPNotebook';
import executeCodeCell from './ExecuteCodeCell';
import { ContentFactory } from './ContentFactory';
import createCellTypeItem from './CreateCellTypeItem';


const chaldeneVPCell: JupyterFrontEndPlugin<void> = {
  id: 'Chaldene: Add VP Cell',
  description: 'Visual Programming in JupyterLab for Image Processing',
  autoStart: true,
  requires: [IToolbarWidgetRegistry, IEditorServices, INotebookWidgetFactory],
  activate: activateChaldeneVPCell,
};

function activateChaldeneVPCell(
  app: JupyterFrontEnd,
  toolbarRegistry: IToolbarWidgetRegistry,
  editorServices: IEditorServices,
  notebookWidgetFactory: any
) {
  // Add a new cell type to the toolbar
  const FACTORY = 'Notebook';
  toolbarRegistry.addFactory<NotebookPanel>(FACTORY, 'cellType', (panel) =>
    createCellTypeItem(panel)
  );

  // Replace the default notebook by our VPNotebook
  const editorFactory = editorServices.factoryService.newInlineEditor;
  notebookWidgetFactory.contentFactory = new ContentFactory({
    editorFactory,
  });

  // Enhance the execute method of the CodeCell for visual code
  CodeCell.execute = executeCodeCell;
}

// TODO: CLEANUP
// const chaldeneCloseMenuWhenCloseTab: JupyterFrontEndPlugin<void> = {
//   id: 'Chaldene:CloseMenuWhenCloseTab',
//   autoStart: true,
//   requires: [ILabShell],
//   activate: activateVp4jlCloseMenuWhenCloseTab,
// };

// function activateVp4jlCloseMenuWhenCloseTab(
//   app: JupyterFrontEnd,
//   labShell: ILabShell
// ) {
//   // close the context menu when switch the tab
//   labShell.currentChanged.connect((_, args) => {
//     const NotebookPanel = args.oldValue;
//     const content = NotebookPanel?.content;
//     if (content && content instanceof VPNotebook) {
//       content.closeMenus();
//     }
//   });
// }

const plugins: Array<JupyterFrontEndPlugin<any>> = [
  chaldeneVPCell,
  // chaldeneCloseMenuWhenCloseTab,
];

export default plugins;
