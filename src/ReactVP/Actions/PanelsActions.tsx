import StateActions from './StateActions';
import { cloneElement } from 'react';

export default class PanelsActions extends StateActions {
  private readonly counter: number = 0;
  public getPanelType = (name: string): React.ComponentType<any> => {
    const availables = this.editorContext?.panelComponents ?? {};
    return availables[name];
  };

  public open = (type: string, props: Record<string, any>): void => {
    this.stateAction((panels: any) => {
      const index: number = panels.findIndex(
        (panel: any) => panel.props.type === type
      );
      if (index !== -1) {
        if (props === panels[index].props) {
          return panels;
        }
        const updatedPanel = cloneElement(panels[index], { ...props });
        return [
          ...panels.slice(0, index),
          updatedPanel,
          ...panels.slice(index + 1)
        ];
      } else {
        const Panel = this.getPanelType(type);
        if (!Panel) {
          console.error(`Panel type ${type} not available`);
          return panels;
        }
        return [
          ...panels,
          <Panel
            {...props}
            key={this.counter}
            type={type}
            editorContext={this.editorContext}
          />
        ];
      }
    });
  };

  public close = (type?: string): void => {
    if (!type) {
      this.stateAction([]);
    }
    this.stateAction((panels: any) => {
      return panels.filter((panel: any) => panel.props.type !== type);
    });
  };
}
