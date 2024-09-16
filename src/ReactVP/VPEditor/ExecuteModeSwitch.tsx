import { useState } from 'react';
import { ControlButton } from '@xyflow/react';
import type EditorContext from '../EditorContext';

function LiveIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
    </svg>
  );
}

function NotLiveIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" fill="#4CAF50" />
    </svg>
  );
}

export default function ExecuteModeSwitch({
  editorContext
}: {
  editorContext: EditorContext;
}): JSX.Element {
  const [isLiveExecute, setIsLiveExecute] = useState<boolean>(
    editorContext.getIsLiveExecution()
  );

  const toggleExecutionMode = (): void => {
    editorContext.setIsLiveExecution(!isLiveExecute);
    setIsLiveExecute(!isLiveExecute);
  };

  return (
    <ControlButton
      onClick={toggleExecutionMode}
      title={
        isLiveExecute ? 'Turn off live execution' : 'Turn on live execution'
      }
    >
      {isLiveExecute ? <NotLiveIcon /> : <LiveIcon />}
    </ControlButton>
  );
}
