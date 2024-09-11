import React from 'react';
import { Widget } from '@lumino/widgets';
import { ReactWidget } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { VPEditor, type Graph, type EditorContext } from 'chaldene_vpe';
import 'chaldene_vpe/dist/style.css';
import { INotebookTracker, NotebookActions } from '@jupyterlab/notebook';

type ISharedText = any;

export class VPWidget extends ReactWidget {
  constructor(
    id: string,
    model: CodeEditor.IModel,
    tracker: INotebookTracker,
    fileBrowser: any
  ) {
    super();
    this.id = id;
    this.node.style.width = '100%';
    this.node.style.height = '100%';

    this.node.addEventListener('focusout', e => {
      e.preventDefault();
      if (this._focused) {
        e.stopPropagation();
      }
    });

    this.node.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
    });

    this._model = model;
    this._tracker = tracker;
    this._fileBrowser = fileBrowser;
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
      this.sharedModel.setSource(newContent);
    }
  }

  getCode(): string {
    return this._context?.code() ?? '';
  }

  setContext(context: EditorContext): void {
    this._context = context;

    this._context.addGraphChangeListener(new_graph => {
      this.setContent(JSON.stringify(new_graph));
    });

    this._context.onLiveExecution = this.run.bind(this);

    this._context.onFocus = () => {
      this._focused = true;
      this.node.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    };
    this._context.onBlur = () => {
      this._focused = false;
      this.node.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    };

    this._context.parentContext = {
      openFileDialog: () => openFileDialog(this._fileBrowser)
    };
  }

  get hasFocus(): boolean {
    return this._focused;
  }

  onStartRun(): void {
    if (this._context) {
      this._context.notifyExecuteStart();
    }
  }

  onEndRun(): void {
    console.log('Execution ended');
    if (this._context) {
      this._context.notifyExecuteEnd();
    }
  }

  updateInspection(id: string, imageData: string) {
    this._context?.action('graph').updateInspection(id, imageData);
  }

  listenToInspectResult(currentKernel: any): void {
    currentKernel?.registerCommTarget(
      'capture_image',
      (comm: any, msg: any) => {
        comm.onMsg = (msg: any) => {
          const id: string = msg.content.data.handle_id;
          const imageData = msg.content.data.image_data;
          this?.updateInspection(id, `data:image/png;base64,${imageData}`);
        };
      }
    );
  }

  run(): void {
    const inWhichPanel = this._tracker.currentWidget;
    if (inWhichPanel) {
      const { content, context, sessionDialogs, translator } =
        inWhichPanel as any;
      NotebookActions.run(
        content,
        context.sessionContext,
        sessionDialogs,
        translator
      );
    } else {
      console.error('No active notebook panel found');
    }
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
  private _model: CodeEditor.IModel;
  private _context: EditorContext | null = null;
  private _tracker: INotebookTracker;
}

export function createVPWidget(
  id: string,
  model: any,
  host: HTMLElement,
  tracker: INotebookTracker,
  fileBrowser: any
): VPWidget {
  const editor = new VPWidget(id, model, tracker, fileBrowser);
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
async function openFileDialog(fileBrowser: any): Promise<string | null> {
  // cleanup find the manager, use fileBrowser to replace fileDialog
  await fileBrowser.model.refresh();
  const result = await FileDialog.getOpenFiles({
    manager: fileBrowser.model.manager
  });
  if (result.button.accept && result.value) {
    return result.value[0].path;
  }
  return null;
}
