import { CodeCell } from '@jupyterlab/cells';
import { NotebookPanel, Notebook } from '@jupyterlab/notebook';
import { VPEditorFactory } from './VPEditorFactory';
import { VPNotebook } from './VPNotebook';

export class ContentFactory extends NotebookPanel.ContentFactory {
  constructor(options: any) {
    super(options);
    this._editorFactories['code'] = options.editorFactory;
    this._editorFactories['visual code'] = VPEditorFactory;
  }

  createNotebook(options: Notebook.IOptions): Notebook {
    return new VPNotebook(options);
  }

  createCodeCell(options: CodeCell.IOptions): CodeCell {
    const opts = options;
    if (options.model.getMetadata('code type') === 'visual code') {
      opts.contentFactory = new ContentFactory({
        editorFactory: this._editorFactories['visual code']
      });
    } else if (
      options.contentFactory.editorFactory !== this._editorFactories['code']
    ) {
      opts.contentFactory = new ContentFactory({
        editorFactory: this._editorFactories['code']
      });
    }
    return super.createCodeCell(opts);
  }
  private _editorFactories: Record<string, any> = {};
}
