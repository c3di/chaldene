import { Notebook as NB } from '@jupyterlab/notebook';
import { EDITOR_CLASS } from './VPEditor';
import { ArrayExt } from '@lumino/algorithm';

const NB_CELL_CLASS = 'jp-Notebook-cell';

export class VPNotebook extends NB {
  isVisualCodeCell(widget: any): boolean {
    return widget.node.querySelectorAll(`.${EDITOR_CLASS}`).length > 0;
  }

  handleEvent(event: Event): void {
    if (!this.model) {
      return;
    }
    switch (event.type) {
      case 'mousedown':
        if (event.eventPhase === Event.CAPTURING_PHASE) {
          this.evtMouseDownCapture(event as MouseEvent);
        } else {
          super.handleEvent(event);
        }
        break;
      default:
        super.handleEvent(event);
        break;
    }
  }

  /**
   * Find the cell index containing the target html element.
   *
   * #### Notes
   * Returns -1 if the cell is not found.
   */
  findCell(node: HTMLElement): number {
    // Trace up the DOM hierarchy to find the root cell node.
    // Then find the corresponding child and select it.
    let n: HTMLElement | null = node;
    while (n && n !== this.node) {
      if (n.classList.contains(NB_CELL_CLASS)) {
        const i = ArrayExt.findFirstIndex(
          this.widgets,
          widget => widget.node === n
        );
        if (i !== -1) {
          return i;
        }
        break;
      }
      n = n.parentElement;
    }
    return -1;
  }

  /**
   * Find the target of html mouse event and cell index containing this target.
   *
   * #### Notes
   * Returned index is -1 if the cell is not found.
   */
  findEventTargetAndCell(event: MouseEvent): [HTMLElement, number] {
    let target = event.target as HTMLElement;
    let index = this.findCell(target);
    if (index === -1) {
      // `event.target` sometimes gives an orphaned node in Firefox 57, which
      // can have `null` anywhere in its parent line. If we fail to find a cell
      // using `event.target`, try again using a target reconstructed from the
      // position of the click event.
      target = document.elementFromPoint(
        event.clientX,
        event.clientY
      ) as HTMLElement;
      index = this.findCell(target);
    }
    return [target, index];
  }

  /**
   * Handle `mousedown` event in the capture phase for the widget.
   */
  evtMouseDownCapture(event: MouseEvent): void {
    const { button, shiftKey } = event;

    const [target, index] = this.findEventTargetAndCell(event);
    const widget = this.widgets[index];

    // On OS X, the context menu may be triggered with ctrl-left-click. In
    // Firefox, ctrl-left-click gives an event with button 2, but in Chrome,
    // ctrl-left-click gives an event with button 0 with the ctrl modifier.
    if (
      button === 2 &&
      !shiftKey &&
      widget &&
      widget.editorWidget?.node.contains(target) &&
      !this.isVisualCodeCell(widget)
    ) {
      this.mode = 'command';

      // Prevent CodeMirror from focusing the editor.
      // TODO: find an editor-agnostic solution.
      event.preventDefault();
    }
  }
}
