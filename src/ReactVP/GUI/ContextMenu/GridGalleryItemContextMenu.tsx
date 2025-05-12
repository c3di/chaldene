import { useMemo } from 'react';
import ContextMenu, { type ContextMenuElement } from './ContextMenu';
import type { GUIElementProps } from '../GUIElement';
import type { IGalleryImage } from '../../Widgets/ImageGallery';

interface IGridGalleryItemContextMenuProps extends GUIElementProps {
  forWhom: IGalleryImage;
  handleAddToCompare: (image: IGalleryImage) => void;
}

export default function GridGalleryItemContextMenu({
  forWhom,
  clientPosition,
  editorContext,
  handleAddToCompare
}: IGridGalleryItemContextMenuProps): ContextMenuElement {
  const items = useMemo(() => {
    return [
      {
        displayLabel: 'Add to Compare',
        onClick: (event: React.MouseEvent, imageAsForWhom: any) => {
          if (
            imageAsForWhom &&
            typeof imageAsForWhom === 'object' &&
            'filename' in imageAsForWhom
          ) {
            handleAddToCompare(imageAsForWhom as IGalleryImage);
          } else {
            console.error(
              '[GridGalleryItemContextMenu] imageAsForWhomArgument was undefined in MenuItem onClick. Cannot add to compare.'
            );
          }
        }
      }
    ];
  }, [handleAddToCompare]);
  if (!forWhom) {
    console.error(
      'GridGalleryItemContextMenu: forWhom prop is missing or undefined!'
    );
  }

  return (
    <ContextMenu
      forWhom={forWhom}
      items={items}
      clientPosition={clientPosition}
      editorContext={editorContext}
    />
  );
}
