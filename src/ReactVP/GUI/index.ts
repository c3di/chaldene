/**
 * The Menu can be used to create context menus for nodes, edges, panels, and connections.
 * Only one menu can be displayed at a time. When the editor loss focus, the menu will be closed.
 *
 * The Panel can be used to create panels that can be displayed in the editor.
 * Many panels can be displayed at the same time, but for each panel type, only one panel can be displayed.
 */
import ExecuteInProcess from './Panel/ExecuteInProcess';
import EdgeContextMenu from './ContextMenu/EdgeContextMenu';
import NodeContextMenu from './ContextMenu/NodeContextMenu';
import PanelContextMenu from './ContextMenu/PanelContextMenu';
import ConnectionTooltips from './ContextMenu/ConnectionTooltips';
import NotReadyNodePanel from './Panel/NotReadyNodePanel';

export type { GUIElementType } from './GUIElement';
export type { default as GUIElement } from './GUIElement';
export type {
  ContextMenuElement,
  ContextMenuType
} from './ContextMenu/ContextMenu';

export const MenuComponents: Record<string, React.ComponentType<any>> = {
  node: NodeContextMenu,
  edge: EdgeContextMenu,
  panel: PanelContextMenu,
  connection: ConnectionTooltips
};

export const PanelComponents: Record<string, React.ComponentType<any>> = {
  notReadyNodePanel: NotReadyNodePanel,
  executeInProcess: ExecuteInProcess
};

export { NodeContextMenu, EdgeContextMenu };
