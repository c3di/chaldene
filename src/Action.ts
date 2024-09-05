import { Notebook } from '@jupyterlab/notebook';
import * as nbformat from '@jupyterlab/nbformat';
import { ISharedAttachmentsCell } from '@jupyter/ydoc';
import { MarkdownCell } from '@jupyterlab/cells';

/**
 * Change the selected cell type(s).
 *
 * @param notebook - The target notebook widget.
 *
 * @param value - The target cell type.
 *
 * #### Notes
 * It should preserve the widget mode.
 * This action can be undone.
 * The existing selection will be cleared.
 * Any cells converted to markdown will be unrendered.
 */
export function changeCellType(
  notebook: Notebook,
  value: nbformat.CellType
): void {
  if (!notebook.model || !notebook.activeCell) {
    return;
  }

  const state = Private.getState(notebook);

  Private.changeCellType(notebook, value);
  Private.handleState(notebook, state);
}

/**
 * Change the selected cell type(s).
 *
 * @param notebook - The target notebook widget.
 *
 * @param value - The target cell type.
 *
 * #### Notes
 * It should preserve the widget mode.
 * This action can be undone.
 * The existing selection will be cleared.
 * Any cells converted to markdown will be unrendered.
 */
namespace Private {
  /**
   * The interface for a widget state.
   */
  export interface IState {
    /**
     * Whether the widget had focus.
     */
    wasFocused: boolean;

    /**
     * The active cell id before the action.
     *
     * We cannot rely on the Cell widget or model as it may be
     * discarded by action such as move.
     */
    activeCellId: string | null;
  }
  /**
   * Get the state of a widget before running an action.
   */
  export function getState(notebook: Notebook): IState {
    return {
      wasFocused: notebook.node.contains(document.activeElement),
      activeCellId: notebook.activeCell?.model.id ?? null
    };
  }

  /**
   * Handle the state of a widget after running an action.
   */
  export function handleState(
    notebook: Notebook,
    state: IState,
    scrollIfNeeded = false
  ): void {
    const { activeCell, activeCellIndex } = notebook;

    if (state.wasFocused || notebook.mode === 'edit') {
      notebook.activate();
    }

    if (scrollIfNeeded && activeCell) {
      notebook.scrollToItem(activeCellIndex, 'smart', 0.05).catch(reason => {
        // no-op
      });
    }
  }

  export function changeCellType(
    notebook: Notebook,
    value: nbformat.CellType
  ): void {
    const notebookSharedModel = notebook.model!.sharedModel;
    notebook.widgets.forEach((child, index) => {
      if (!notebook.isSelectedOrActive(child)) {
        return;
      }
      const differentType = child.model.type !== value;
      const differentCodeType = child.model.type === value && value === 'code';
      if (differentType || differentCodeType) {
        const raw = child.model.toJSON();
        notebookSharedModel.transact(() => {
          notebookSharedModel.deleteCell(index);
          if (value === 'code') {
            // After change of type outputs are deleted so cell can be trusted.
            raw.metadata.trusted = true;
          } else {
            // Otherwise clear the metadata as trusted is only "valid" on code
            // cells (since other cell types cannot have outputs).
            raw.metadata.trusted = undefined;
          }
          const newCell = notebookSharedModel.insertCell(index, {
            cell_type: value,
            source: raw.source,
            metadata: raw.metadata
          });
          if (raw.attachments && ['markdown', 'raw'].includes(value)) {
            (newCell as ISharedAttachmentsCell).attachments =
              raw.attachments as nbformat.IAttachments;
          }
        });
      }
      if (value === 'markdown') {
        // Fetch the new widget and unrender it.
        child = notebook.widgets[index];
        (child as MarkdownCell).rendered = false;
      }
    });
    notebook.deselectAll();
  }
}
