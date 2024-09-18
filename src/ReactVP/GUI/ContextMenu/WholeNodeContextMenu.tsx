import { useMemo } from 'react';
import type { GUIElementProps } from '../GUIElement';
import ContextMenu, { type ContextMenuElement } from './ContextMenu';
import {
  CopyIcon,
  CutIcon,
  DeleteIcon,
  DuplicateIcon,
  UnlinkIcon
} from '../../Style';

export default function WholeNodeContextMenu({
  forWhom,
  clientPosition,
  editorContext
}: GUIElementProps): ContextMenuElement {
  const items = useMemo(() => {
    const graphActions = editorContext.action('graph');
    return [
      {
        icon: <DeleteIcon />,
        displayLabel: 'Delete',
        description: 'Delete selected element(s)',
        shortcut: 'Del',
        onClick: graphActions?.removeSelected
      },
      {
        icon: <CopyIcon />,
        displayLabel: 'Copy',
        description: 'Copy selected element(s)',
        shortcut: 'Ctrl+C',
        onClick: graphActions?.copy
      },
      {
        icon: <CutIcon />,
        displayLabel: 'Cut',
        description: 'Cut selected element(s)',
        shortcut: 'Ctrl+X',
        onClick: graphActions?.cut
      },
      {
        icon: <DuplicateIcon />,
        displayLabel: 'Duplicate',
        description: 'Duplicate selected element(s)',
        shortcut: 'Ctrl+D',
        onClick: graphActions?.duplicate
      },
      {
        icon: <UnlinkIcon />,
        displayLabel: 'Break all connection(s)',
        description: 'Break all connections of the selected node(s)',
        onClick: (event: any, node: any) => graphActions?.disconnectNode(node),
        disabled: (node: any) => !graphActions?.isNodeConnected(node)
      }
    ];
  }, [editorContext, forWhom]);

  return (
    <ContextMenu
      forWhom={forWhom}
      items={items}
      clientPosition={clientPosition}
      editorContext={editorContext}
    />
  );
}
