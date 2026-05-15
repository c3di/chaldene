/*
 * CodeCell Focus management or Cell Edit/Command Mode
 * - focusin focusout events bubbling up from inner focusable elements. Make sure the inner elements are focusable
 * - focus() blur() methods to control by keyboard
 */

import { Widget } from '@lumino/widgets';
import { ReactWidget } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { CodeCell } from '@jupyterlab/cells';
import { VPEditor, type Graph, type EditorContext } from './ReactVP';
import { PathExt } from '@jupyterlab/coreutils';
import { getChaldeneService } from './serviceRegistry';
import type { ISharedBaseCell } from '@jupyter/ydoc';

type ISharedText = any;

export class VPWidget extends ReactWidget {
  constructor(
    id: string,
    model: CodeEditor.IModel,
    hostNotebookPanel: any,
    fileBrowser: any
  ) {
    super();
    this.id = id;
    this.node.style.width = '100%';
    this.node.style.height = '100%';

    this.node.addEventListener('focusout', e => {
      e.preventDefault();
      if (this._focused) {
        // Prevent the focus from leaving the cell
        e.stopPropagation();
      }
    });

    this.node.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
    });

    this.node.addEventListener(
      'wheel',
      e => {
        if (!this._focused) {
          e.stopPropagation();
        }
      },
      { capture: true }
    );

    this._model = model;
    this._hostNotebookPanel = hostNotebookPanel;
    this._fileBrowser = fileBrowser;
  }

  get hasFocus(): boolean {
    return this._focused;
  }

  // control by keyboard
  focus(): void {
    this._context?.focus();
  }
  // control by keyboard
  blur(): void {
    this._context?.blur();
  }

  get sharedModel(): ISharedText {
    return this._model.sharedModel;
  }

  get content(): Graph {
    let source = undefined;
    try {
      source = JSON.parse(this.sharedModel.getSource());
    } catch (e) {
      source = { nodes: [], edges: [] };
    }
    return source;
  }

  setContent(newContent: string) {
    if (this.sharedModel.getSource() !== newContent) {
      // Insert content in chunks to avoid large transactions that report invalid string length
      const CHUNK_SIZE = 20000;
      for (let i = 0; i < newContent.length; i += CHUNK_SIZE) {
        const chunk = newContent.substring(i, i + CHUNK_SIZE);
        this.sharedModel.updateSource(i, i + CHUNK_SIZE, chunk);
      }
    }
  }

  getCode(): string {
    return this._context?.code() ?? '';
  }

  dispose(): void {
    if (this._cellId) {
      getChaldeneService()?.deregister(this._cellId);
    }
    super.dispose();
  }

  setContext(context: EditorContext): void {
    this._context = context;

    this._context.addGraphChangeListener(new_graph => {
      this.setContent(JSON.stringify(new_graph));
    });

    const run = this.run.bind(this);
    this._context.onLiveExecution = run;

    const cellId = (this._model.sharedModel as ISharedBaseCell).getId();
    this._cellId = cellId;
    getChaldeneService()?.register(cellId, context, run);

    // Update the focus state from the inner editor
    this._context.onFocus = () => {
      this._focused = true;
    };
    this._context.onBlur = () => {
      this._focused = false;
    };

    this._context.parentContext = {
      openFileDialog: (fileExtensions?: string[]) =>
        openFileDialog(
          this._fileBrowser,
          PathExt.dirname(this._hostNotebookPanel.context.path),
          fileExtensions
        )
    };
  }

  onStartRun(): void {
    if (this._context) {
      this._context.notifyExecuteStart();
    }
  }

  onEndRun(): void {
    if (this._context) {
      this._context.notifyExecuteEnd();
    }
  }

  run(): void {
    if (!this._hostNotebookPanel) {
      console.error('No active notebook panel found');
      return;
    }
    const { content, context } = this._hostNotebookPanel;

    // Execute this specific VP cell directly rather than via
    // NotebookActions.run, which runs whatever cell happens to be active and
    // would re-run an unrelated cell (e.g. the caller's slider cell).
    for (const cell of content.widgets) {
      if ((cell.model.sharedModel as ISharedBaseCell).getId() === this._cellId) {
        this.onStartRun();
        CodeCell.execute(cell as any, context.sessionContext)
          .catch((error: Error) => {
            console.error('Error while running cell:', error);
          })
          .finally(() => {
            this.onEndRun();
          });
        return;
      }
    }
    console.error('VP cell not found in notebook, id:', this._cellId);
  }

  render(): JSX.Element {
    return (
      <VPEditor
        id={'v' + this.id.split('-')[0]}
        graph={this.content}
        onInitialized={this.setContext.bind(this)}
      />
    );
  }
  private _fileBrowser: any;
  private _focused = false;
  private _cellId: string | undefined = undefined;
  private _model: CodeEditor.IModel;
  private _context: EditorContext | null = null;
  private _hostNotebookPanel: any;
}

export function createVPWidget(
  id: string,
  model: any,
  host: HTMLElement,
  hostNotebookPanel: any,
  fileBrowser: any
): VPWidget {
  const editor = new VPWidget(id, model, hostNotebookPanel, fileBrowser);
  host.style.height = '500px';
  host.style.overflow = 'auto';
  host.style.resize = 'vertical';

  window.requestAnimationFrame(() => {
    if (host.isConnected) {
      Widget.attach(editor, host);
    }
  });
  return editor;
}

import { FileDialog } from '@jupyterlab/filebrowser';
async function openFileDialog(
  fileBrowser: any,
  defaultPath: string = '',
  fileExtensions?: string[]
): Promise<string | null> {
  // cleanup find the manager

  await fileBrowser.model.refresh();

  const dialog = FileDialog.getOpenFiles({
    defaultPath: defaultPath,
    manager: fileBrowser.model.manager,
    title: 'Select an image',
    filter: (value: any) => {
      if (
        value.type === 'directory' ||
        !fileExtensions ||
        fileExtensions.length === 0
      ) {
        return { score: 1 };
      }

      for (const extension of fileExtensions) {
        if (value.path.endsWith(extension)) {
          return { score: 1 };
        }
      }
      return null;
    }
  });

  const observer = preventItemDoubleClickInFileBrowser();
  observer.observe(document.body, { childList: true, subtree: true });
  const result = await dialog;
  observer.disconnect();
  if (result.button.accept && result.value) {
    const path = result.value[0].path;
    const relativePath = PathExt.relative(defaultPath, path);
    return relativePath;
  }
  return null;
}

function preventItemDoubleClickInFileBrowser(): MutationObserver {
  const observer = new MutationObserver((mutationsList, observer) => {
    const dialogElement = document.getElementById(
      'filtered-file-browser-dialog'
    );
    if (!dialogElement) {
      return;
    }
    const dialogItems = dialogElement.querySelectorAll('.jp-DirListing-item');
    if (!dialogItems || dialogItems.length === 0) {
      return;
    }

    dialogItems.forEach(item => {
      const isDir = item.getAttribute('data-isdir') === 'true';
      if (isDir) {
        return;
      }
      if (item.getAttribute('dbclick-prevented') === 'true') {
        return;
      }
      item.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();
      });
      item.setAttribute('dbclick-prevented', 'true');
    });
  });
  return observer;
}
