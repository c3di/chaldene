import { useMemo } from 'react';
import type { GUIElementProps } from '../GUIElement';
import type { ConnectionStatus } from '../../Type';
import ContextMenu, {
  type ContextMenuElement,
  IContextMenuProps
} from './ContextMenu';
import { CheckReadinessIcon, RejectIcon } from '../../Style/icons';

const TooltipMenu: React.FC<IContextMenuProps> = ({ ...props }) => {
  return (
    <div
      className="tooltip-menu"
      style={{
        position: 'absolute',
        left: props.clientPosition.x,
        top: props.clientPosition.y
      }}
    >
      <ContextMenu {...props} />
    </div>
  );
};

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
    <TooltipMenu
      forWhom={forWhom}
      items={items}
      clientPosition={clientPosition}
      editorContext={editorContext}
    />
  );
}
