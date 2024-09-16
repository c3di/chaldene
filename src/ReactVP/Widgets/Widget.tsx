import React from 'react';
import { type Identifier } from '../Type';
import type EditorContext from '../EditorContext';

export interface WidgetProps {
  forWhom?: Identifier;
  value?: any;
  setValue?: (identifier?: Identifier, value?: any) => void;
  editorContext?: EditorContext;
  [key: string]: any;
}

type Widget = React.ComponentType<WidgetProps>;
export default Widget;

export const NotFoundWidget = React.forwardRef<HTMLDivElement, WidgetProps>(
  (props, ref) => <div ref={ref}>Widget not found</div>
);
NotFoundWidget.displayName = 'NotFoundWidget';
