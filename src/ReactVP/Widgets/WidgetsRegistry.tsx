import { Registry } from '../Type';
import { NotFoundWidget } from './Widget';
import type Widget from './Widget';

export default class WidgetsRegistry extends Registry<Widget> {
  public get(type: string | undefined): Widget {
    return type ? (super.get(type) ?? NotFoundWidget) : NotFoundWidget;
  }

  public getOutputType(type: string): string | null {
    return type ? (this.widgetOutputType[type] ?? null) : null;
  }

  public register(
    type: string,
    widget: Widget,
    outputType?: string | string[]
  ): string {
    if (outputType) {
      this.widgetOutputType[type] = Array.isArray(outputType)
        ? outputType[0]
        : outputType;
    }
    return super.register(type, widget);
  }

  private readonly widgetOutputType: Record<string, string | null> = {};
}
