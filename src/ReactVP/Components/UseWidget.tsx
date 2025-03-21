import { useMemo } from 'react';
import { NotFoundWidget } from '../Widgets';
import { type ValueCategory, type Identifier } from '../Type';

export default function useWidget(
  forWhichCategory: ValueCategory,
  widget: any,
  defaultValue: any,
  editorContext: any,
  identifier?: Identifier,
  label?: string,
  nodeDimensions?: { width: number; height?: number }
): JSX.Element | null {
  return useMemo(() => {
    const type = widget?.type;
    if (!type) {
      return null;
    }

    const WidgetComponent =
      editorContext?.widgetRegistry?.get(type) ?? NotFoundWidget;

    const widgetProps = {
      ...widget,
      forWhom: identifier,
      value: defaultValue,
      ...widget?.value,
      setValue: (identifier?: Identifier, value?: any) => {
        editorContext
          ?.action('graph')
          .setValue(forWhichCategory, identifier, value);
      },
      label,
      editorContext,
      ...(type === 'ImageViewer' ? { nodeDimensions } : {})
    };
    return <WidgetComponent {...widgetProps} />;
  }, [
    widget,
    defaultValue,
    editorContext,
    identifier,
    forWhichCategory,
    label,
    nodeDimensions
  ]);
}
