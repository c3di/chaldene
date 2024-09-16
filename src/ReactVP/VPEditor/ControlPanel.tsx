import { Controls as RcControls, ControlButton } from '@xyflow/react';
import type EditorContext from '../EditorContext';
import ExecuteModeSwitch from './ExecuteModeSwitch';
import { AutoLayoutIcon } from '../Style';

export interface ControlPanelProps {
  editorContext: EditorContext;
}

export default function ControlPanel({
  editorContext
}: ControlPanelProps): JSX.Element {
  return (
    <>
      <RcControls
        position="top-right"
        style={{ flexDirection: 'row' }}
        showInteractive={false}
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
    </>
  );
}
