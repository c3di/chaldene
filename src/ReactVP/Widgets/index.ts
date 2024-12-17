import WidgetsRegistry from './WidgetsRegistry';
import { ImageViewerWithFullscreen } from './ImageViewerN';
import HistogramRangeWidget from './HistogramRangeWidget';

import {
  Text,
  Boolean,
  NumericInput,
  Slider,
  Dropdown,
  FileInputFromServer
} from './Input';
import Tuple2Input from './Tuple2Input';

export { type default as Widget } from './Widget';
export { type WidgetProps, NotFoundWidget } from './Widget';
export { default as WidgetsRegistry } from './WidgetsRegistry';

export const widgetsRegistry = new WidgetsRegistry();

export function registerWidget(
  forWhichType: string,
  widget: any,
  outputType?: string
): void {
  widgetsRegistry.register(forWhichType, widget, outputType);
}

registerWidget('String', Text, 'string');
registerWidget('Boolean', Boolean, 'boolean');
registerWidget('Number', NumericInput, 'number');
registerWidget('Slider', Slider, 'number');
registerWidget('Dropdown', Dropdown, 'enum');
registerWidget('Tuple2', Tuple2Input, 'tuple2');
registerWidget('ImageViewer', ImageViewerWithFullscreen);
registerWidget('FileInputFromServer', FileInputFromServer, 'string');
registerWidget('HistogramRange', HistogramRangeWidget, 'tuple2');
