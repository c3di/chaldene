import { useMemo } from 'react';
import ContextMenu from './ContextMenu';
import type { GUIElementProps } from '../GUIElement';
import { type ContextMenuElement } from './ContextMenu';
import SearchMenu from './SearchMenu';

import {
  AutoLayoutIcon,
  CheckReadinessIcon,
  CodeIcon,
  FitViewIcon,
  PasteIcon,
  SelectAllIcon
} from '../../Style';

export default function PanelContextMenu({
  forWhom,
  clientPosition,
  editorContext
}: GUIElementProps): ContextMenuElement {
  const items = useMemo(() => {
    const graphActions = editorContext.action('graph');
    const sceneActions = editorContext.action('scene');

    const nodeSpecs = editorContext.getNodeSpecs();

    const searchMenuWidget = (
      <div
        className="search-menu-container"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <SearchMenu
          nodeSpecs={nodeSpecs}
          onSelectNodeSpec={(spec: any) => {
            try {
              const scenePosition = editorContext
                .action('scene')
                .clientToScenePosition(clientPosition);

              graphActions.addNodeFromSpec(spec.name, scenePosition);
              editorContext.action('menu').close();
            } catch (error) {
              console.error('Error adding node:', error);
            }
          }}
        />
      </div>
    );
    return [
      {
        description: 'Search and add a new node',
        widget: searchMenuWidget
      },
      {
        icon: <PasteIcon />,
        displayLabel: 'Paste',
        description: 'Paste copied element(s)',
        shortcut: 'Ctrl+V',
        onClick: (event: any) =>
          graphActions?.paste(
            editorContext
              .action('scene')
              .clientToScenePosition({ x: event.clientX, y: event.clientY })
          )
      },
      {
        icon: <SelectAllIcon />,
        displayLabel: 'Select all',
        description: 'Select all element(s)',
        shortcut: 'Ctrl+A',
        onClick: graphActions?.selectAll,
        disable: graphActions?.isGraphEmpty
      },
      {
        icon: <FitViewIcon />,
        displayLabel: 'Fit view',
        description: 'Fit the view to the graph',
        onClick: sceneActions?.fitView
      },
      {
        icon: <AutoLayoutIcon />,
        displayLabel: 'Auto layout',
        description: 'Auto layout the graph',
        onClick: sceneActions?.autoLayout
      },
      {
        icon: <CheckReadinessIcon />,
        displayLabel: 'Check readiness',
        description: 'Check if the graph is ready for execution',
        onClick: graphActions?.checkExecutionReadiness
      },
      {
        icon: <CodeIcon />,
        displayLabel: 'Copy code',
        description: 'Generate code for the graph and copy to clipboard',
        onClick: () => {
          const code = editorContext?.code(false, false);
          if (code) {
            void navigator.clipboard.writeText(code);
          }
        }
      }
    ];
  }, [editorContext, forWhom]);

  return (
    <ContextMenu
      forWhom={forWhom}
      items={items}
      clientPosition={clientPosition}
      editorContext={editorContext}
    />
  );
}
