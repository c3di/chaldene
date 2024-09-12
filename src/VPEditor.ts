import { CodeEditor } from '@jupyterlab/codeeditor';
import { UUID } from '@lumino/coreutils';
import { Signal } from '@lumino/signaling';
import { createVPWidget } from './VPWidget';

export const EDITOR_CLASS = 'jp-VPEditor';

export class VPEditor implements CodeEditor.IEditor {
  constructor(options: any) {
    const host = (this.host = options.host);
    host.classList.add(EDITOR_CLASS);
    host.classList.add('jp-Editor');
    host.addEventListener('focus', this, false);
    host.addEventListener('blur', this, false);

    this._uuid = options.uuid ?? UUID.uuid4();
    this._model = options.model;
    this._editor = createVPWidget(
      this._uuid,
      this._model,
      host,
      options.notebookTracker.currentWidget,
      options.fileBrowser
    );
  }

  getCode(): string {
    return this.editor.getCode() ?? '';
  }

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  readonly edgeRequested = new Signal<this, CodeEditor.EdgeLocation>(this);

  /**
   * The DOM node that hosts the editor.
   */
  readonly host: HTMLElement;

  get uuid(): string {
    return this._uuid;
  }

  set uuid(value: string) {
    this._uuid = value;
  }

  get editor(): any {
    return this._editor;
  }

  /**
   * Get the number of lines in the editor.
   */
  get lineCount(): number {
    return 0;
  }

  /**
   * Returns a model for this editor.
   */
  get model(): CodeEditor.IModel {
    return this._model;
  }

  get lineHeight(): number {
    return 0;
  }

  get charWidth(): number {
    return 0;
  }

  /**
   * Tests whether the editor is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.host.removeEventListener('focus', this, true);
    this.host.removeEventListener('blur', this, true);
    this.host.removeEventListener('scroll', this, true);
    Signal.clearData(this);
  }

  /**
   * Get a config option for the editor.
   */
  getOption(option: string): unknown {
    return this._options[option];
  }

  /**
   * Whether the option exists or not.
   */
  hasOption(option: string): boolean {
    return Object.keys(this._options).indexOf(option) > -1;
  }

  /**
   * Set a config option for the editor.
   */
  setOption(option: string, value: unknown): void {
    this._options[option] = value;
  }

  /**
   * Set config options for the editor.
   *
   * This method is preferred when setting several options. The
   * options are set within an operation, which only performs
   * the costly update at the end, and not after every option
   * is set.
   */
  setOptions(options: Record<string, any>): void {
    for (const key in options) {
      this._options[key] = options[key];
    }
  }

  injectExtension(ext: any): void {}

  /**
   * Returns the content for the given line number.
   */
  getLine(line: number): string | undefined {
    return undefined;
  }

  /**
   * Find an offset for the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    return 0;
  }

  /**
   * Find a position for the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    return { line: 0, column: 0 };
  }

  /**
   * Undo one edit (if any undo events are stored).
   */
  undo(): void {
    this.model.sharedModel.undo();
  }

  /**
   * Redo one undone edit.
   */
  redo(): void {
    this.model.sharedModel.redo();
  }

  /**
   * Clear the undo history.
   */
  clearHistory(): void {
    this.model.sharedModel.clearUndoHistory();
  }

  /**
   * Brings browser focus to this editor text.
   */
  focus(): void {
    this._editor.focus();
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean {
    return this._editor.hasFocus;
  }

  /**
   * Explicitly blur the editor.
   */
  blur(): void {
    this._editor.blur();
    this._editor.contentDOM.blur();
  }

  get state(): any {
    throw new Error('Method not implemented yet');
  }

  getRange(
    from: { line: number; ch: number },
    to: { line: number; ch: number },
    separator?: string
  ): string {
    return '';
  }

  /**
   * Reveal the given position in the editor.
   */
  revealPosition(position: CodeEditor.IPosition): void {}

  /**
   * Reveal the given selection in the editor.
   */
  revealSelection(selection: CodeEditor.IRange): void {}

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoordinateForPosition(
    position: CodeEditor.IPosition
  ): CodeEditor.ICoordinate {
    return {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0
    };
  }

  /**
   * Get the cursor position given window coordinates.
   *
   * @param coordinate - The desired coordinate.
   *
   * @returns The position of the coordinates, or null if not
   *   contained in the editor.
   */
  getPositionForCoordinate(
    coordinate: CodeEditor.ICoordinate
  ): CodeEditor.IPosition | null {
    return null;
  }

  /**
   * Returns the primary position of the cursor, never `null`.
   */
  getCursorPosition(): CodeEditor.IPosition {
    return { line: 0, column: 0 };
  }

  /**
   * Set the primary position of the cursor.
   *
   * #### Notes
   * This will remove any secondary cursors.
   */
  setCursorPosition(
    position: CodeEditor.IPosition,
    options?: { bias?: number; origin?: string; scroll?: boolean }
  ): void {}

  /**
   * Returns the primary selection, never `null`.
   */
  getSelection(): CodeEditor.ITextSelection {
    return this.getSelections()[0];
  }

  /**
   * Set the primary selection. This will remove any secondary cursors.
   */
  setSelection(selection: CodeEditor.IRange): void {
    this.setSelections([selection]);
  }

  /**
   * Gets the selections for all the cursors, never `null` or empty.
   */
  getSelections(): CodeEditor.ITextSelection[] {
    return [];
    // throw new Error('Method not implemented yet');
  }

  /**
   * Sets the selections for all the cursors, should not be empty.
   * Cursors will be removed or added, as necessary.
   * Passing an empty array resets a cursor position to the start of a document.
   */
  setSelections(selections: CodeEditor.IRange[]): void {}

  /**
   * Replaces the current selection with the given text.
   *
   * Behaviour for multiple selections is undefined.
   *
   * @param text The text to be inserted.
   */
  replaceSelection(text: string): void {}

  /**
   * Get a list of tokens for the current editor text content.
   */
  getTokens(): CodeEditor.IToken[] {
    return [];
  }

  /**
   * Get the token at a given editor position.
   */
  getTokenAt(offset: number): CodeEditor.IToken {
    return { value: '', offset: 0, type: '' };
  }

  /**
   * Get the token a the cursor position.
   */
  getTokenAtCursor(): CodeEditor.IToken {
    return this.getTokenAt(this.state.selection.main.head);
  }

  /**
   * Insert a new indented line at the current cursor position.
   */
  newIndentedLine(): void {}

  /**
   * Execute a codemirror command on the editor.
   *
   * @param command - The name of the command to execute.
   */
  execCommand(command: any): void {}

  protected onKeydown(event: KeyboardEvent): boolean {
    return false;
  }

  /**
   * Handle the DOM events for the editor.
   *
   * @param event - The DOM event sent to the editor.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the editor's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'focus':
        this._evtFocus(event as FocusEvent);
        break;
      case 'blur':
        this._evtBlur(event as FocusEvent);
        break;
      default:
        break;
    }
  }

  private _evtFocus(event: FocusEvent): void {
    this.host.classList.add('jp-mod-focused');
  }

  private _evtBlur(event: FocusEvent): void {
    this.host.classList.remove('jp-mod-focused');
  }

  private _editor: any;
  private _isDisposed = false;
  private _model: CodeEditor.IModel;
  private _uuid = '';
  private _options: Record<string, any> = {};
}
