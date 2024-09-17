import { Controls as RcControls, ControlButton } from '@xyflow/react';
import type EditorContext from '../EditorContext';
import ExecuteModeSwitch from './ExecuteModeSwitch';
import { AutoLayoutIcon } from '../Style';

export interface IControlPanelProps {
  editorContext: EditorContext;
}

export default function ControlPanel({
  editorContext
}: IControlPanelProps): JSX.Element {
  return (
    <RcControls
      position="top-right"
      showInteractive={false}
      className="control-panel"
      style={{
        flexDirection: 'row',
        top: '12px',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        margin: '10px 3px'
      }}
    >
      <ControlButton
        onClick={(): void => {
          editorContext.action('scene').autoLayout();
        }}
      >
        <AutoLayoutIcon />
      </ControlButton>
      <ExecuteModeSwitch editorContext={editorContext} />
    </RcControls>
  );
}
