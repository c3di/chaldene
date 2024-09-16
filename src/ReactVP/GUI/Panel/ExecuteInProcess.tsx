import type GUIElement from '../GUIElement';
import { type GUIElementProps } from '../GUIElement';

export default function ExecuteInProcess({
  editorContext
}: GUIElementProps): GUIElement {
  const position = editorContext.editorRef.current?.getBoundingClientRect();
  const overlayStyle: React.CSSProperties = position
    ? {
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height
      }
    : { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' };

  return (
    <div
      style={overlayStyle}
      className="executionInProcessOverlay"
      id="overlay"
    >
      <div className="message">Running In Process</div>
      <div className="spinner"></div>
    </div>
  );
}
