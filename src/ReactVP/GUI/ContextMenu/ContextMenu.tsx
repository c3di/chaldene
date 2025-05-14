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

export default function ContextMenu(
  props: IContextMenuProps
): JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);

  // Destructure props at the beginning
  const {
    forWhom: propsForWhom, // Use a distinct name for the prop
    items: propsItems,
    clientPosition: propsClientPosition,
    editorContext: propsEditorContext
  } = props;

  const [position, setPosition] = useState(propsClientPosition);

  useEffect(() => {
    if (!menuRef.current) {
      return;
    }
    propsEditorContext.contextMenuRef = menuRef; // Use prop
    const { width, height } = menuRef.current.getBoundingClientRect();
    setPosition(fitToViewport({ ...propsClientPosition, width, height })); // Use prop
    return (): void => {
      if (propsEditorContext) {
        propsEditorContext.contextMenuRef = null; // Use prop
      }
    };
  }, [propsClientPosition, propsEditorContext]);

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
        {propsItems.map((item, index) => {
          // Use prop
          // This handleClick is specific to each item in the map
          const handleClick = (eventArgument: React.MouseEvent): void => {
            if (item.onClick) {
              item.onClick(eventArgument, propsForWhom);
            }

            propsEditorContext.action('menu').close(); // Use prop
          };
          return (
            <MenuItem
              key={index}
              {...item}
              forWhom={propsForWhom}
              onClick={handleClick}
            />
          );
        })}
      </ul>
    </div>,
    document.body
  );
}
