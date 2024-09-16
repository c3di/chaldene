/*
 * Focus of VPEditor can be managed either:
 * - By using the focusTracker for handling user interactions like click events.
 * - Or programmatically, through the focus() and blur() methods in editorContext.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import FlowEditor from './FlowEditor';
import { nodeSpecRegistry } from '../Spec';
import { widgetsRegistry } from '../Widgets';
import EditorContext from '../EditorContext';
import {
  FocusTracker,
  GraphActions,
  MemuActions,
  PanelActions
} from '../Actions';
import { codeGeneratorRegistry } from '../CodeGeneration';
import { type Graph, defaultGraph } from '../Type';
import { MenuComponents, PanelComponents, type GUIElement } from '../GUI';
import '@xyflow/react/dist/style.css';

export interface IVPEditorProps {
  id: string;
  graph?: Graph;
  language?: string;
  onInitialized?: (editorContext: EditorContext) => void;
}

export default function VPEditor({
  id,
  graph: newGraphInput = defaultGraph,
  language,
  onInitialized: onEditorInitialized
}: IVPEditorProps): JSX.Element {
  const editorRef = useRef(null);
  const [graph, setGraph] = useState();
  const [focused, setFocused] = useState(false);
  const [menu, setMenu] = useState<GUIElement>(null);
  const [panels, setPanels] = useState<GUIElement[]>([]);
  const context = useMemo(() => {
    const newContext = new EditorContext(
      id,
      editorRef,
      nodeSpecRegistry,
      MenuComponents,
      PanelComponents,
      widgetsRegistry,
      codeGeneratorRegistry,
      {
        panels: new PanelActions(setPanels),
        menu: new MemuActions(setMenu),
        graph: new GraphActions(setGraph),
        focusTracker: new FocusTracker(setFocused)
      },
      language
    );
    return newContext;
  }, []);

  useEffect(() => {
    context.newGraphInput(newGraphInput);
  }, [newGraphInput]);

  useEffect(() => {
    if (graph) {
      context.updateGraph(graph);
    }
  }, [graph]);

  useEffect(() => {
    onEditorInitialized?.(context);
  }, [context]);

  useEffect(() => {
    context.focused = focused;
  }, [focused]);

  return (
    <div
      id={id}
      ref={editorRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseDownCapture={context.action('focusTracker').startFocusListener}
    >
      {menu}
      {panels}
      <FlowEditor
        id={id}
        graph={graph}
        editorContext={context}
        focused={focused}
      />
    </div>
  );
}
