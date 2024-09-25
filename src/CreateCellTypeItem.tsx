import * as React from 'react';
import { Notebook } from '@jupyterlab/notebook';
import { HTMLSelect } from '@jupyterlab/ui-components';
import { ReactWidget } from '@jupyterlab/apputils';
import {
  ITranslator,
  TranslationBundle,
  nullTranslator
} from '@jupyterlab/translation';
import { NotebookPanel } from '@jupyterlab/notebook';
import { changeCellType } from './Action';

/**
 * The class name added to toolbar cell type dropdown wrapper.
 */
const TOOLBAR_CELLTYPE_CLASS = 'jp-Notebook-toolbarCellType';
/**
 * The class name added to toolbar cell type dropdown.
 */
const TOOLBAR_CELLTYPE_DROPDOWN_CLASS = 'jp-Notebook-toolbarCellTypeDropdown';

/**
 * A toolbar widget that switches cell types.
 * Only add a new `visual code` option in the dropdown to the code from
 * https://github.com/jupyterlab/jupyterlab/blob/a0d07f17e85acd967e722a5c5ed54529a361e5cf/packages/notebook/src/default-toolbar.tsx#L316
 */
class CellTypeSwitcher extends ReactWidget {
  /**
   * Construct a new cell type switcher.
   */
  constructor(widget: Notebook, translator?: ITranslator) {
    super();
    this._trans = (translator || nullTranslator).load('jupyterlab');
    this.addClass(TOOLBAR_CELLTYPE_CLASS);
    this._notebook = widget;
    if (widget.model) {
      this.update();
    }
    widget.activeCellChanged.connect(this.update, this);
    // Follow a change in the selection.
    widget.selectionChanged.connect(this.update, this);
  }

  /**
   * Handle `change` events for the HTMLSelect component.
   */
  handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (event.target.value !== '-') {
      let changeTo = event.target.value;
      this._notebook.widgets.forEach((child, index) => {
        if (this._notebook.isSelectedOrActive(child)) {
          if (changeTo === 'visual code') {
            child.model.setMetadata('code type', changeTo);
            changeTo = 'code';
          } else {
            child.model.deleteMetadata('code type');
          }
        }
      });
      changeCellType(this._notebook, changeTo);
      this._notebook.activate();
    }
  };

  /**
   * Handle `keydown` events for the HTMLSelect component.
   */
  handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.keyCode === 13) {
      this._notebook.activate();
    }
  };

  render(): JSX.Element {
    let value = '-';
    if (this._notebook.activeCell) {
      value = this._notebook.activeCell.model.type;
    }
    let multipleSelected = false;
    for (const widget of this._notebook.widgets) {
      if (this._notebook.isSelectedOrActive(widget)) {
        if (widget.model.type !== value) {
          value = '-';
          multipleSelected = true;
          break;
        }
      }
    }

    if (
      !multipleSelected &&
      this._notebook.activeCell?.model.getMetadata('code type') ===
        'visual code'
    ) {
      value = 'visual code';
    }

    return (
      <HTMLSelect
        className={TOOLBAR_CELLTYPE_DROPDOWN_CLASS}
        onChange={this.handleChange}
        onKeyDown={this.handleKeyDown}
        value={value}
        aria-label={this._trans.__('Cell type')}
        title={this._trans.__('Select the cell type')}
      >
        <option value="-">-</option>
        <option value="visual code">{'Visual Code'}</option>
        <option value="code">{this._trans.__('Code')}</option>
        <option value="markdown">{this._trans.__('Markdown')}</option>
        <option value="raw">{this._trans.__('Raw')}</option>
      </HTMLSelect>
    );
  }

  private _trans: TranslationBundle;
  private _notebook: Notebook;
}

/**
 * Create a cell type switcher item.
 *
 * #### Notes
 * It will display the type of the current active cell.
 * If more than one cell is selected but are of different types,
 * it will display `'-'`.
 * When the user changes the cell type, it will change the
 * cell types of the selected cells.
 * It can handle a change to the context.
 */
export default function createCellTypeItem(panel: NotebookPanel): ReactWidget {
  return new CellTypeSwitcher(panel.content);
}
