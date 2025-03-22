import StateActions from './StateActions';

export default class FocusTracker extends StateActions {
  public setFocused = (focused: boolean): void => {
    if (focused !== this.editorContext?.focused) {
      this.stateAction(focused);
      if (focused) {
        this.editorContext?.onFocus?.();
      } else {
        this.stopFocusListener();
        this.editorContext?.action('menu').close();
        this.editorContext?.action('panels').close();
        if (this.editorContext) {
          this.editorContext.blockTriggerRunCode = true;
        }
        this.editorContext?.onBlur?.();
      }
    }
  };

  public detectingFocus = (event: MouseEvent): void => {
    const editor = this.editorContext?.editorRef.current;
    const contextMenu = this.editorContext?.contextMenuRef?.current;
    this.setFocused(
      editor?.contains(event.target) || contextMenu?.contains(event.target)
    );
  };

  public startFocusListener = (): void => {
    this.setFocused(true);
    document.addEventListener('mousedown', this.detectingFocus, {
      capture: true,
      once: true
    });
  };

  public stopFocusListener = (): void => {
    document.removeEventListener('mousedown', this.detectingFocus, {
      capture: true
    });
  };
}
