import { useMemo } from 'react';
import ContextMenu from './ContextMenu';
import type { GUIElementProps } from '../GUIElement';
import { type IHandleIdentifier } from '../../Type';
import { UnlinkIcon } from '../../Style';

export default function HandleContextMenu({
  forWhom,
  clientPosition,
  editorContext
}: GUIElementProps): JSX.Element {
  const items = useMemo(() => {
    const graphActions = editorContext.action('graph');
    return [
      {
        icon: <UnlinkIcon />,
        displayLabel: 'Break all connection(s)',
        description: 'Break all connections of this handle',
        onClick: (event: any, forwhom: IHandleIdentifier) =>
          graphActions?.disconnectHandle(forwhom),
        disabled: (forwhom: any) => !graphActions?.isHandleConnected(forwhom)
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
