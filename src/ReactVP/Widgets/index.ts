import WidgetsRegistry from './WidgetsRegistry';
import BoundingBoxInput from './BoundingBoxInput';
import CanvasImage from './CanvasImage';
import ImageCropper from './ImageCropper';
import ImageViewer from './ImageViewer';

import {
  Text,
  Boolean,
  Number,
  Slider,
  Dropdown,
  FileInput,
  FileInputFromServer
} from './Input';

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
registerWidget('Number', Number, 'number');
registerWidget('Slider', Slider, 'number');
registerWidget('Dropdown', Dropdown, 'enum');
registerWidget('BoundingBox', BoundingBoxInput);
registerWidget('CanvasImage', CanvasImage);
registerWidget('ImageCropper', ImageCropper);
registerWidget('ImageViewer', ImageViewer);
registerWidget('File', FileInput, 'file');
registerWidget('FileInputFromServer', FileInputFromServer, 'string');
