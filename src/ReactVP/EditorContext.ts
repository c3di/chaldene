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
  public onLiveExecution?: (code: string) => void = undefined;
  public focused: boolean = false;
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
  private prevExecGraph: Graph | null = null;
  private isLiveExecution: boolean = false;
  private nextNodeId: number = 0;
  private nextEdgeId: number = 0;
  // for jupyterlab
  public parentContext?: any = undefined;

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
    if (isLiveExecution) {
      this.triggerLiveExection();
    }
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
      this.nextNodeId = 0;
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
    this.triggerLiveExection();
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
    this.action('panels').open('executeInProcess', {}, {});
  };

  public notifyExecuteEnd = (): void => {
    this.action('panels').close('executeInProcess');
  };

  public addGraphChangeListener = (listener: (graph: Graph) => void): void => {
    this.graphChangeListeners.push(listener);
  };

  public triggerLiveExection = (): void => {
    if (this.isLiveExecution) {
      const code = this.code();
      if (code && this.onLiveExecution) {
        this.onLiveExecution(code);
      }
    }
  };

  /*
   * @param identifier: string - editorID_nodeID_handleID
   */
  public updateInspection = (handleID: string, value: any): void => {
    console.log('updateInspection', handleID, value);
    this.action('graph').updateInspection(handleID, value);
  };

  /*
   * @param increment: whether to return code on the changed part of the graph or the whole graph.
   */
  public code = (increment: boolean = true): string | null => {
    if (!this.graph) {
      return null;
    }

    if (!this.checkExecutionReadiness()) {
      return null;
    }

    const graphToBeExecuted = increment
      ? findCodeChangedGraph(this.prevExecGraph, this.graph)
      : this.graph;
    if (!graphToBeExecuted) {
      return null;
    }

    this.prevExecGraph = this.graph;
    console.log('flowsToBeExecuted', graphToBeExecuted);
    const codes = this.codeGeneratorRegistry
      .get(this.executeLanguage)
      .codeFromGraph(this.editorID, graphToBeExecuted);
    return codes;
  };

  public focus = (): void => {
    this.action('focusTracker').setFocused(true);
  };

  public blur = (): void => {
    this.action('focusTracker').setFocused(false);
  };
}
