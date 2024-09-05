import { CodeEditor } from '@jupyterlab/codeeditor';
import { VPEditor } from './VPEditor';

export const VPEditorFactory = (options: CodeEditor.IOptions): any => {
  options.host.dataset.type = 'inline';
  return new VPEditor(options);
};
