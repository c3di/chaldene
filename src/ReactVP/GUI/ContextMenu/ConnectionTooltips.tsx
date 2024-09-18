import { useMemo, useRef, useEffect, useState } from 'react';
import type { GUIElementProps } from '../GUIElement';
import type { ConnectionStatus } from '../../Type';
import ContextMenu, {
  type ContextMenuElement,
  IContextMenuProps
} from './ContextMenu';
import { CheckReadinessIcon, RejectIcon } from '../../Style/icons';

const TooltipMenu: React.FC<IContextMenuProps> = ({ ...props }) => {
  const [adjustedPosition, setAdjustedPosition] = useState(
    props.clientPosition
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newY = props.clientPosition.y - rect.height - 15; // Position above cursor
      const newX = props.clientPosition.x - rect.width + 10;
      setAdjustedPosition({ x: newX, y: newY });
    }
  }, [props.clientPosition]);

  return (
    <div
      ref={menuRef}
      className="tooltip-menu"
      style={{
        position: 'absolute',
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      <ContextMenu {...props} clientPosition={adjustedPosition} />
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
