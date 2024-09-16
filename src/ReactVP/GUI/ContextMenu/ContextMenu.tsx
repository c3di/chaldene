import { useRef, useEffect, useState } from 'react';
import type EditorContext from '../../EditorContext';
import MenuItem, { type IMenuItemConfig } from './MenuItem';
import ReactDOM from 'react-dom';

export type ContextMenuElement = JSX.Element | null;
export type ContextMenuType = React.ComponentType<any>;

export interface IContextMenuProps {
  forWhom: any;
  clientPosition: { x: number; y: number };
  editorContext: EditorContext;
  items: IMenuItemConfig[];
}

function fitToViewport({
  x,
  y,
  width,
  height
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}): {
  x: number;
  y: number;
} {
  return {
    x: x + width > window.innerWidth ? window.innerWidth - width : x,
    y: y + height > window.innerHeight ? y - height : y
  };
}

export default function ContextMenu({
  forWhom,
  items,
  clientPosition,
  editorContext
}: IContextMenuProps): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(clientPosition);

  useEffect(() => {
    if (!menuRef.current) {
      return;
    }
    editorContext.contextMenuRef = menuRef;
    const { width, height } = menuRef.current.getBoundingClientRect();
    setPosition(fitToViewport({ ...clientPosition, width, height }));
    return (): void => {
      editorContext.contextMenuRef = null;
    };
  }, [clientPosition]);

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="ContextMenu"
      style={{
        left: position.x,
        top: position.y
      }}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <ul className="ContextMenu-content" role="menu">
        {items.map((item, index) => {
          const handleClick = (event: React.MouseEvent): void => {
            item.onClick?.(event, forWhom);
            editorContext.action('menu').close();
          };
          return (
            <MenuItem
              key={index}
              {...item}
              forWhom={forWhom}
              onClick={handleClick}
            />
          );
        })}
      </ul>
    </div>,
    document.body
  );
}
