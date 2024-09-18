import { useMemo } from 'react';
import type { GUIElementProps } from '../GUIElement';
import ContextMenu, { type ContextMenuElement } from './ContextMenu';
import { DeleteIcon } from '../../Style';

export default function EdgeContextMenu({
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
        description: 'Delete selected edge(s)',
        shortcut: 'Del',
        onClick: graphActions?.removeSelected
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
