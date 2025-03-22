import type React from 'react';
import { type NodeTypes } from './Components';
import { type WidgetsRegistry } from './Widgets';
import { type CodeGeneratorRegistry } from './CodeGeneration';
import type { NodeSpecConfigRegistry } from './Spec/NodeSpecRegistry';
import { type Graph, findCodeChangedGraph } from './Type';
import { ActionRegistry } from './Actions';
import { graphWithoutEditorContext } from './Utils';

export default class EditorContext {
  public readonly editorRef: React.MutableRefObject<any>;
  public contextMenuRef: React.MutableRefObject<any> | null = null;
  // Only be updated by the editor that is currently rendered.
  public graph?: Graph = undefined;
  public graphChangeListeners: Array<(graph: Graph) => void> = [];
  public onLiveExecution?: () => void = undefined;
  public focused: boolean = false;
  public blockTriggerRunCode: boolean = true;
  public onFocus?: () => void = undefined;
  public onBlur?: () => void = undefined;
  public nodeSpecRegistry?: NodeSpecConfigRegistry = undefined;
  public menuComponents: Record<string, React.ComponentType<any>> = {};
  public panelComponents: Record<string, React.ComponentType<any>> = {};
  public widgetRegistry?: WidgetsRegistry = undefined;
  public actionsRegistry: ActionRegistry = new ActionRegistry();
  public codeGeneratorRegistry: CodeGeneratorRegistry;
  public onChangeForCodeGeneration?: (startNodeID: string) => void = undefined;
  public readonly editorID: string = '';
  private readonly executeLanguage: string;
  private prevExecGraph?: Graph = undefined;
  private isLiveExecution: boolean = true;
  private nextNodeId: number = 0;
  private nextEdgeId: number = 0;
  private runningInProcessCount: number = 0;
  public isAsyncImageViewTransform: boolean = true;
  private imageViewTransforms: {
    ungrouped: { x?: number; y?: number; zoom?: number };
    grouped: { [key: number]: { x?: number; y?: number; zoom?: number } };
  } = {
    ungrouped: { x: undefined, y: undefined, zoom: undefined },
    grouped: {}
  };
  // for jupyterlab
  public parentContext?: any = undefined;
  private isAsyncMousePosition: boolean = true;
  private mousePosition: { x?: number; y?: number } = {
    x: undefined,
    y: undefined
  };

  constructor(
    editorID: string,
    editorRef: React.MutableRefObject<any>,
    nodeSpecRegistry: NodeSpecConfigRegistry,
    menuComponents: Record<string, React.ComponentType<any>>,
    panelComponents: Record<string, React.ComponentType<any>>,
    widgetRegistry: WidgetsRegistry,
    codeGeneratorRegistry: CodeGeneratorRegistry,
    actions: Record<string, any>,
    executeLanguage?: string
  ) {
    this.editorID = editorID;
    this.editorRef = editorRef;
    this.menuComponents = menuComponents;
    this.panelComponents = panelComponents;
    this.widgetRegistry = widgetRegistry;
    this.nodeSpecRegistry = nodeSpecRegistry;
    Object.entries(actions).forEach(([key, action]) => {
      this.registAction(key, action);
    });
    this.codeGeneratorRegistry = codeGeneratorRegistry;
    this.executeLanguage = executeLanguage ?? 'Python';
  }

  get nodeTypes(): NodeTypes {
    return this.nodeSpecRegistry?.allVisualNodeTypes ?? {};
  }

  public getNodeId(): string {
    return (this.nextNodeId++).toString();
  }

  public getEdgeId(): string {
    return (this.nextEdgeId++).toString();
  }

  public getNodeSpecs(): any[] {
    return this.nodeSpecRegistry?.allNodeSpecs ?? [];
  }

  public getIsLiveExecution = (): boolean => {
    return this.isLiveExecution;
  };

  public setIsLiveExecution = (isLiveExecution: boolean): void => {
    this.isLiveExecution = isLiveExecution;
    this.triggerLiveExecution();
  };

  public newGraphInput = (graph: Graph): void => {
    this.nextNodeId =
      1 + Math.max(0, ...graph.nodes.map(node => parseInt(node.id, 10)));
    if (Number.isNaN(this.nextNodeId)) {
      this.nextNodeId = 0;
    }
    this.nextEdgeId =
      1 + Math.max(0, ...graph.edges.map(edge => parseInt(edge.id, 10)));
    if (Number.isNaN(this.nextEdgeId)) {
      this.nextEdgeId = 0;
    }
    this.action('graph').newGraphInput(graph);
  };

  public updateGraph = (graph: Graph): void => {
    // todo: redo undo
    this.graph = graph;
    // remove context editor to avoid circular reference to JSON.stringify
    this.graphChangeListeners.forEach(listener => {
      listener(graphWithoutEditorContext(graph));
    });
    this.triggerLiveExecution();
  };

  public registAction = (name: string, action: any): void => {
    action.editorContext = this;
    this.actionsRegistry.register(name, action);
  };

  public action = (name: string): any => {
    return this.actionsRegistry.get(name);
  };

  public checkExecutionReadiness = (): boolean => {
    return this.action('graph').checkExecutionReadiness();
  };

  public notifyExecuteStart = (): void => {
    if (this.runningInProcessCount === 0) {
      this.action('panels').open('executeInProcess', {}, {});
    }
    this.runningInProcessCount++;
  };

  public notifyExecuteEnd = (): void => {
    this.runningInProcessCount--;
    if (this.runningInProcessCount === 0) {
      this.action('panels').close('executeInProcess');
    }
  };

  public addGraphChangeListener = (listener: (graph: Graph) => void): void => {
    this.graphChangeListeners.push(listener);
  };

  /*
   * @param identifier: string - editorID_nodeID_handleID
   */
  public updateInspection = (handleID: string, value: any): void => {
    this.action('graph').updateInspection(handleID, value);
    // Trigger code generation after inspection update
    this.triggerLiveExecution();
  };

  public getGraphToBeExecuted = (increment: boolean = true): Graph | null => {
    if (!this.graph || !this.checkExecutionReadiness()) {
      return null;
    }

    return increment
      ? findCodeChangedGraph(this.prevExecGraph, this.graph)
      : this.graph;
  };

  public triggerLiveExecution = (): void => {
    if (
      !this.blockTriggerRunCode &&
      this.focused &&
      this.isLiveExecution &&
      this.getGraphToBeExecuted()
    ) {
      this.onLiveExecution?.();
    }
  };

  /*
   * There are two modes for retrieving code:
   * 1. **Not Live**: Code is retrieved manually, either from the context menu or by clicking the run button.
   * 2. **Live**: Code is generated automatically during live execution. It can be triggered when live execution
   *  is toggled or as the execution runs.
   * so, getGraphToBeExecuted to be called here again
   *
   * @param increment: whether to return code on the changed part of the graph or the whole graph.
   */
  public code = (
    increment: boolean = true,
    inspect_included = true
  ): string | null => {
    const graphToBeExecuted = this.getGraphToBeExecuted(increment);
    if (!graphToBeExecuted) {
      return null;
    }

    this.prevExecGraph = this.graph;

    const codes = this.codeGeneratorRegistry
      .get(this.executeLanguage)
      .codeFromGraph(this.editorID, graphToBeExecuted, inspect_included);

    return codes;
  };

  public focus = (): void => {
    this.action('focusTracker').setFocused(true);
  };

  public blur = (): void => {
    this.action('focusTracker').setFocused(false);
  };

  public toggleAsyncImageViewTransform = (): void => {
    this.isAsyncImageViewTransform = !this.isAsyncImageViewTransform;
    if (!this.isAsyncImageViewTransform) {
      this.imageViewTransforms = {
        ungrouped: { x: undefined, y: undefined, zoom: undefined },
        grouped: {}
      };
    }
  };

  public fitImageToCanvas = (): void => {
    this.updateGlobalTransform({
      x: undefined,
      y: undefined,
      zoom: undefined,
      force: true
    });
  };

  public getImageViewTransform = (
    syncGrouptoGet?: number
  ): {
    x?: number;
    y?: number;
    zoom?: number;
  } => {
    return this.isAsyncImageViewTransform
      ? syncGrouptoGet === undefined
        ? this.imageViewTransforms.ungrouped
        : (this.imageViewTransforms.grouped[syncGrouptoGet] ??
          this.imageViewTransforms.ungrouped)
      : { x: undefined, y: undefined, zoom: undefined };
  };

  public updateGlobalTransform = ({
    x,
    y,
    zoom,
    force = false,
    syncGrouptoUpdate
  }: {
    x?: number;
    y?: number;
    zoom?: number;
    force?: boolean;
    syncGrouptoUpdate?: number;
  }): void => {
    if (this.isAsyncImageViewTransform || force) {
      if (syncGrouptoUpdate === undefined) {
        this.imageViewTransforms.ungrouped = { x, y, zoom };
      } else {
        this.imageViewTransforms.grouped[syncGrouptoUpdate] = { x, y, zoom };
      }

      this.action('graph').overrideGraph({
        ...this.graph,
        nodes: this.graph?.nodes.map(node => {
          const hasMatchingSyncGroup = node.data.outputs?.some(
            output =>
              output.widget?.type === 'ImageViewer' &&
              output.widget?.syncGroup === syncGrouptoUpdate
          );

          if (hasMatchingSyncGroup) {
            return { ...node };
          }
          return node;
        })
      });
    }
  };

  public toggleAsyncMousePosition = (): void => {
    this.isAsyncMousePosition = !this.isAsyncMousePosition;
    if (!this.isAsyncMousePosition) {
      this.mousePosition = { x: undefined, y: undefined };
    }
  };

  public getMousePosition = (): {
    x?: number;
    y?: number;
  } => {
    return this.isAsyncMousePosition
      ? this.mousePosition
      : { x: undefined, y: undefined };
  };

  public updateMousePosition = ({
    x,
    y,
    force = false
  }: {
    x?: number;
    y?: number;
    force?: boolean;
  }): void => {
    if (this.isAsyncMousePosition || force) {
      this.mousePosition = { x, y };
      //force to re-render
      this.action('graph').overrideGraph({
        ...this.graph,
        nodes: this.graph?.nodes.map(node => ({ ...node }))
      });
    }
  };
}
