import type EditorContext from '../EditorContext';

export interface GUIElementProps {
  forWhom: any;
  clientPosition: { x: number; y: number };
  editorContext: EditorContext;
  event?: React.MouseEvent | MouseEvent;
}

type GUIElement = JSX.Element | null;
export default GUIElement;

export type GUIElementType = React.ComponentType<GUIElement>;
