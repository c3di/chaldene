import { type ContextMenuType } from '../GUI';
import StateActions from './StateActions';

export default class MenuActions extends StateActions {
  public getMenuType = (name: string): ContextMenuType => {
    const availables = this.editorContext?.menuComponents ?? {};
    return availables[name];
  };

  public open = (
    type: string,
    event: React.MouseEvent | MouseEvent | { clientX: number; clientY: number },
    props: Record<string, any>
  ): void => {
    const Element = this.getMenuType(type);
    if (!Element) {
      console.error(`Menu elment type ${type} not available`);
      this.close();
      return;
    }
    if (
      'preventDefault' in event &&
      typeof event.preventDefault === 'function'
    ) {
      event.preventDefault();
      // event.stopPropagation();
    }
    const position = { x: event.clientX, y: event.clientY };
    this.stateAction(
      <Element
        {...props}
        event={event}
        clientPosition={position}
        editorContext={this.editorContext}
      />
    );
  };

  public close = (): void => {
    this.stateAction(null);
  };
}
