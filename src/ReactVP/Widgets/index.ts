import WidgetsRegistry from './WidgetsRegistry';
import BoundingBoxInput from './BoundingBoxInput';
import CanvasImage from './CanvasImage';
import ImageCropper from './ImageCropper';
import ImageViewer from './ImageViewerN';

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
registerWidget('BoundingBox', BoundingBoxInput);
registerWidget('CanvasImage', CanvasImage);
registerWidget('ImageCropper', ImageCropper);
registerWidget('ImageViewer', ImageViewer);
registerWidget('FileInputFromServer', FileInputFromServer, 'string');
