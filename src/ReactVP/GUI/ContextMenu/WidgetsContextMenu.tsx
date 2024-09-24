import { useMemo } from 'react';
import ContextMenu from './ContextMenu';
import type { GUIElementProps } from '../GUIElement';
import { FitViewIcon } from '../../Style';

export default function WidgetsContextMenu({
  forWhom,
  clientPosition,
  editorContext
}: GUIElementProps): JSX.Element {
  const items = useMemo(() => {
    const syncView = `${editorContext.isAsyncImageViewTransform ? 'Disable' : 'Enable'}`;
    return [
      {
        displayLabel: `${syncView} sync view`,
        description: `${syncView} same zoom and pan settings to all image viewers for a consistent view.`,
        onClick: () => {
          editorContext.toggleAsyncImageViewTransform();
        }
      },
      {
        icon: <FitViewIcon />,
        displayLabel: 'Fit view',
        description: 'Reset Zoom and Pan to fit the canvas',
        onClick: editorContext.fitImageToCanvas
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
