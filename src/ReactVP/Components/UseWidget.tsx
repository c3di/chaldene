import { useMemo } from 'react';
import { NotFoundWidget } from '../Widgets';
import { type ValueCategory, type Identifier } from '../Type';

export default function useWidget(
  forWhichCategory: ValueCategory,
  widget: any,
  defaultValue: any,
  editorContext: any,
  identifier: any,
  label?: string
): JSX.Element | null {
  return useMemo(() => {
    const type = widget?.type;
    if (!type) {
      return null;
    }

    const widgetValue = widget?.value?.histogram
      ? {
          ...defaultValue,
          histogram: widget.value.histogram
        }
      : defaultValue;

    const WidgetComponent =
      editorContext?.widgetRegistry?.get(type) ?? NotFoundWidget;

    const widgetProps = {
      ...widget,
      forWhom: identifier,
      value: widgetValue, // Use the combined value
      setValue: (identifier?: Identifier, value?: any) => {
        editorContext
          ?.action('graph')
          .setValue(forWhichCategory, identifier, value);
      },
      label,
      editorContext
    };
    return <WidgetComponent {...widgetProps} />;
  }, [
    widget,
    defaultValue,
    editorContext,
    identifier,
    forWhichCategory,
    label,
    widget?.value?.histogram
  ]);
}
