import { useMemo } from 'react';
import type { GUIElementProps } from '../GUIElement';
import type { ConnectionStatus } from '../../Type';
import ContextMenu, { type ContextMenuElement } from './ContextMenu';
import { CheckReadinessIcon, RejectIcon } from '../../Style/icons';

export default function ConnectionTooltips({
  forWhom,
  clientPosition,
  editorContext,
  status
}: GUIElementProps & { status: ConnectionStatus }): ContextMenuElement {
  const items = useMemo(() => {
    return [
      {
        icon:
          status.status === 'replace' ? <CheckReadinessIcon /> : <RejectIcon />,
        displayLabel: status.message,
        onClick: undefined
      }
    ];
  }, [editorContext, forWhom, status]);

  return (
    <ContextMenu
      forWhom={forWhom}
      items={items}
      clientPosition={clientPosition}
      editorContext={editorContext}
    />
  );
}
