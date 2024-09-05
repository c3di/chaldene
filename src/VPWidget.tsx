import React from 'react';
import { Widget } from '@lumino/widgets';
import { ReactWidget } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import { VPEditor, type Graph, type EditorContext } from 'chaldene_vpe';
import 'chaldene_vpe/dist/style.css';

type ISharedText = any;

export class VPWidget extends ReactWidget {
  constructor(id: string, model: CodeEditor.IModel) {
    super();
    this.id = id;
    this.node.style.width = '100%';
    this.node.style.height = '100%';
    this.node.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.node.addEventListener('focusout', e => {
      //todo: cleanup
      // e.preventDefault();
      // const nextFocusedElement = e.relatedTarget as HTMLElement;
      // const isElementChild = this.contains(nextFocusedElement);
      // const isMenu = nextFocusedElement?.classList[0].includes('Mui');
      // if (nextFocusedElement && (isElementChild || isMenu)) {
      //   e.stopPropagation();
      // }
    });
    this._model = model;
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
    this._context.addGraphChangeListener(() => {
      this.setContent(JSON.stringify(this._context?.graph));
    });
  }

  closeMenu(): void {
    this._context?.closeMenu();
  }

  get hasFocus(): boolean {
    return this._editor_activated;
  }

  focus(): void {
    if (!this._editor_activated) {
      this.closeMenu();
      this.update();
    }
  }

  blur(): void {
    if (this._editor_activated) {
      this._editor_activated = false;
      this.closeMenu();
      this.update();
    }
  }

  render(): JSX.Element {
    return (
      <VPEditor
        id={this.id}
        graph={this.content}
        onInitialized={this.setContext.bind(this)}
      />
    );
  }

  private _editor_activated = false;
  private _model: CodeEditor.IModel;
  private _context: EditorContext | null = null;
}

export function createVPWidget(id: string, model: any, host: HTMLElement): any {
  const editor = new VPWidget(id, model);
  host.style.height = '300px';
  host.style.overflow = 'auto';
  host.style.resize = 'vertical';

  window.requestAnimationFrame(() => {
    if (host.isConnected) {
      Widget.attach(editor, host);
    }
  });
  return editor;
}

