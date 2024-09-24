import { type ContextMenuElement } from './ContextMenu';
import HandleContextMenu from './HandleContextMenu';
import type { GUIElementProps } from '../GUIElement';
import WholeNodeContextMenu from './WholeNodeContextMenu';
import {
  getHandleIdentifier,
  isClickOnHandle,
  isClickOnWidget
} from '../../Utils';
import WidgetsContextMenu from './WidgetsContextMenu';

const nodeMenuTypes = {
  Handle: HandleContextMenu,
  Node: WholeNodeContextMenu,
  Widget: WidgetsContextMenu
};

const getMenuType = (
  node: string,
  event?: MouseEvent | React.MouseEvent<Element, MouseEvent>
) => {
  return isClickOnHandle(event)
    ? { whichPart: getHandleIdentifier(event), Menu: nodeMenuTypes.Handle }
    : isClickOnWidget(event)
      ? { whichPart: null, Menu: nodeMenuTypes.Widget }
      : { whichPart: node, Menu: nodeMenuTypes.Node };
};

export default function NodeContextMenu({
  forWhom,
  event,
  clientPosition,
  editorContext
}: GUIElementProps): ContextMenuElement {
  const { whichPart, Menu } = getMenuType(forWhom, event);

  return (
    <Menu
      forWhom={whichPart}
      clientPosition={clientPosition}
      editorContext={editorContext}
    />
  );
}
