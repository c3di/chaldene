import { type ContextMenuElement } from './ContextMenu';
import HandleContextMenu from './HandleContextMenu';
import type { GUIElementProps } from '../GUIElement';
import WholeNodeContextMenu from './WholeNodeContextMenu';
import { getHandleIdentifier, isClickOnHandle } from '../../Utils';

const nodeMenuTypes = {
  Handle: HandleContextMenu,
  Node: WholeNodeContextMenu
};

export default function NodeContextMenu({
  forWhom,
  event,
  clientPosition,
  editorContext
}: GUIElementProps): ContextMenuElement {
  const isMenu4Handle = isClickOnHandle(event);
  const whichPart = isMenu4Handle ? getHandleIdentifier(event) : forWhom;
  const MenuToShow = isMenu4Handle ? nodeMenuTypes.Handle : nodeMenuTypes.Node;

  return (
    <MenuToShow
      forWhom={whichPart}
      clientPosition={clientPosition}
      editorContext={editorContext}
    />
  );
}
