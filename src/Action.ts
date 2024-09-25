import { Notebook } from '@jupyterlab/notebook';
import * as nbformat from '@jupyterlab/nbformat';
import { ISharedAttachmentsCell } from '@jupyter/ydoc';
import { MarkdownCell } from '@jupyterlab/cells';

/**
 * Insert a new code cell below the active cell or in index 0 if the notebook is empty.
 * https://github.com/jupyterlab/jupyterlab/blob/c7ab6e97af2a432af91ca9fc5a9514a5be1cee8a/packages/notebook/src/actions.tsx#L416C3-L451C4
 * @param notebook - The target notebook widget.
 *
 * #### Notes
 * The widget mode will be preserved.
 * This action can be undone.
 * The existing selection will be cleared.
 * The new cell will be the active cell.
 */
export function insertBelow(notebook: Notebook): void {
  if (!notebook.model) {
    return;
  }

  const state = Private.getState(notebook);
  const model = notebook.model;

  const newIndex = notebook.activeCell ? notebook.activeCellIndex + 1 : 0;
  model.sharedModel.insertCell(newIndex, {
    cell_type: notebook.notebookConfig.defaultCell,
    metadata:
      notebook.notebookConfig.defaultCell === 'code'
        ? {
            // This is an empty cell created by user, thus is trusted
            trusted: true,
            'code type': 'visual code' // This is a visual code cell
          }
        : {}
  });
  // Make the newly inserted cell active.
  notebook.activeCellIndex = newIndex;

  notebook.deselectAll();
  void Private.handleState(notebook, state, true);
}

/**
 * Insert a new code cell above the active cell or in index 0 if the notebook is empty.
 *
 * @param notebook - The target notebook widget.
 *
 * #### Notes
 * The widget mode will be preserved.
 * This action can be undone.
 * The existing selection will be cleared.
 * The new cell will the active cell.
 */
export function insertAbove(notebook: Notebook): void {
  if (!notebook.model) {
    return;
  }

  const state = Private.getState(notebook);
  const model = notebook.model;

  const newIndex = notebook.activeCell ? notebook.activeCellIndex : 0;
  model.sharedModel.insertCell(newIndex, {
    cell_type: notebook.notebookConfig.defaultCell,
    metadata:
      notebook.notebookConfig.defaultCell === 'code'
        ? {
            // This is an empty cell created by user, thus is trusted
            trusted: true,
            'code type': 'visual code' // This is a visual code cell
          }
        : {}
  });
  // Make the newly inserted cell active.
  notebook.activeCellIndex = newIndex;

  notebook.deselectAll();
  void Private.handleState(notebook, state, true);
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
