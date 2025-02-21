import WidgetsRegistry from './WidgetsRegistry';
import ImageViewer from './ImageViewerN';
import HistogramRangeWidget from './HistogramRangeWidget';
import ImageCropper from './ImageCropperWidget';
import { ImageGallery } from './ImageGallery';

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
  outputType?: string | string[]
): void {
  widgetsRegistry.register(forWhichType, widget, outputType);
}
registerWidget('String', Text, 'string');
registerWidget('Boolean', Boolean, 'boolean');
registerWidget('Number', NumericInput, 'number');
registerWidget('Slider', Slider, 'number');
registerWidget('Dropdown', Dropdown, 'enum');
registerWidget('Tuple2', Tuple2Input, 'tuple2');
registerWidget('ImageViewer', ImageViewer);
registerWidget('FileInputFromServer', FileInputFromServer, 'string');
registerWidget('HistogramRange', HistogramRangeWidget, 'tuple2');
registerWidget('ImageCropper', ImageCropper, 'tuple4');
registerWidget('ImageGallery', ImageGallery, ['image', 'image[]']);
