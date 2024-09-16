import { useMemo } from 'react';
import type { GUIElementProps } from '../GUIElement';
import { type ConnecteStatus } from '../../Type';
import ContextMenu, { type ContextMenuElement } from './ContextMenu';

export default function ConnectionTooltips({
  forWhom,
  clientPosition,
  editorContext,
  status
}: GUIElementProps & { status: ConnecteStatus }): ContextMenuElement {
  const items = useMemo(() => {
    return [
      {
        // todo: add icons for each status
        // icon:
        //   options.status === 'accept'
        //     ? 'check'
        //     : options.status === 'accept'
        //     ? 'exchange'
        //     : 'close',
        displayLabel: status.message
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
