# Chaldene — Cell Insertion and Redraw Mechanisms

This document traces two tightly related lifecycle paths:

1. **Cell insertion** — how a new Visual Node cell is created and mounted.
2. **Redraw / update** — how the React canvas is updated when the graph changes, when a cell re-executes, or when inspection data arrives from the kernel.

---

## Part 1: Inserting a New Visual Node Cell

### Trigger points

A Visual Node cell can be inserted in two ways:

| Trigger | Code path |
|---------|-----------|
| User presses `B` / `A` (keyboard shortcut for insert below/above) | `NotebookActions.insertBelow/insertAbove` — overridden by the plugin |
| User clicks the `+` toolbar button | Same overridden functions |
| User picks "Visual Code" in the cell-type dropdown and an existing cell is converted | `CreateCellTypeItem.tsx → Action.changeCellType` |

### Step-by-step: insert below

```
NotebookActions.insertBelow(notebook)           [src/Action.ts:17]
  model.sharedModel.insertCell(newIndex, {
      cell_type: 'code',
      metadata: { trusted: true, 'code type': 'visual code' }
  })
  notebook.activeCellIndex = newIndex
  Private.handleState(notebook, state, scrollIfNeeded=true)
```

`model.sharedModel.insertCell` writes into the Yjs shared document. JupyterLab observes this change and creates a new `CodeCell` widget for the index.

### Step-by-step: `ContentFactory.createCodeCell`

```
ContentFactory.createCodeCell(options)          [src/ContentFactory.ts:17]
  options.model.getMetadata('code type') === 'visual code'
    → opts.contentFactory = new ContentFactory({ editorFactory: VPEditorFactory })
  super.createCodeCell(opts)
    → CodeCell constructor
        → cell.editorWidget = opts.contentFactory.createCellEditor(…)
            → calls VPEditorFactory(editorOptions)
```

`ContentFactory.createCodeCell` reads the cell's `'code type'` metadata. When it is `'visual code'` it substitutes the editor factory with `VPEditorFactory` before calling the JupyterLab base implementation, which in turn constructs the cell editor.

### `VPEditorFactory`

```
VPEditorFactory(options: CodeEditor.IOptions)   [src/VPEditorFactory.ts:4]
  options.host.dataset.type = 'inline'
  return new VPEditor(options)
```

### `VPEditor` constructor

```
new VPEditor(options)                           [src/VPEditor.ts:9]
  this.host = options.host
  host.classList.add('jp-VPEditor', 'jp-Editor')
  host.addEventListener('focus', this)
  host.addEventListener('blur', this)
  this._uuid = options.uuid ?? UUID.uuid4()
  this._model = options.model          ← CodeEditor.IModel (backed by shared doc)
  this._editor = createVPWidget(
      uuid, model, host,
      options.notebookTracker.currentWidget,   ← the active NotebookPanel
      options.fileBrowser
  )
```

### `createVPWidget`

```
createVPWidget(id, model, host, panel, fileBrowser)   [src/VPWidget.tsx:204]
  editor = new VPWidget(id, model, panel, fileBrowser)
  host.style.height   = '500px'
  host.style.overflow = 'auto'
  host.style.resize   = 'vertical'

  window.requestAnimationFrame(() => {
      if (host.isConnected) {
          Widget.attach(editor, host)   ← Lumino mounts the widget
      }
  })
  return editor
```

The `requestAnimationFrame` defers `Widget.attach` to the next paint. This ensures the host `<div>` has been inserted into the live DOM and has measurable dimensions before Lumino triggers its `onAfterAttach` / React render cycle.

### `VPWidget.render` — first React render

`Widget.attach` calls Lumino's lifecycle methods, which eventually call `ReactWidget.onAfterShow`, triggering a React render:

```
VPWidget.render()                               [src/VPWidget.tsx:188]
  return (
    <VPEditor
      id={'v' + uuid.split('-')[0]}
      graph={this.content}              ← JSON.parse(model.sharedModel.getSource())
      onInitialized={this.setContext}
    />
  )
```

`this.content` reads the cell source. For a brand-new cell this is `''`, which fails `JSON.parse` and falls back to `{ nodes: [], edges: [] }`.

### `VPEditor` mounts — React initialisation

```
VPEditor({ id, graph, onInitialized })          [src/ReactVP/VPEditor/VPEditor.tsx]

  // One-time setup (useMemo with empty deps)
  context = new EditorContext(
      id,
      editorRef,
      nodeSpecRegistry, menuComponents, panelComponents,
      widgetsRegistry, codeGeneratorRegistry,
      {
        panels:       new PanelActions(setPanels),
        menu:         new MenuActions(setMenu),
        graph:        new GraphActions(setGraph),
        focusTracker: new FocusTracker(setFocused),
      }
  )

  // Effects
  useEffect([newGraphInput] → context.newGraphInput(graph))    // runs on mount
  useEffect([graph]         → context.updateGraph(graph))      // runs when state changes
  useEffect([context]       → onInitialized(context))          // runs once
```

`onInitialized` is `VPWidget.setContext`, which wires the bidirectional bridge (see below).

### `VPWidget.setContext` — wiring the bridge

```
VPWidget.setContext(context)                    [src/VPWidget.tsx:98]
  context.addGraphChangeListener(graph =>
      this.setContent(JSON.stringify(graph))    // graph → notebook cell source
  )
  context.onLiveExecution = this.run.bind(this) // execution trigger
  context.onFocus  = () => { this._focused = true  }
  context.onBlur   = () => { this._focused = false }
  context.parentContext = { openFileDialog: … }
```

After this call, the system is fully initialised. The graph stored in the Yjs shared document is the source of truth; the React state is the in-memory working copy.

### Full insertion sequence (summary)

```
User action
  │
  ▼
Action.insertBelow / insertAbove
  │  model.sharedModel.insertCell (Yjs write)
  ▼
JupyterLab observes Yjs change → creates CodeCell widget
  │
  ▼
ContentFactory.createCodeCell
  │  detects 'visual code' metadata
  ▼
VPEditorFactory(options)
  │
  ▼
new VPEditor(options)
  │  createVPWidget(…)
  ▼
new VPWidget  ←→  (requestAnimationFrame) ←→  Widget.attach
  │
  ▼
VPWidget.render() → <VPEditor graph={empty} />
  │
  ▼
VPEditor mounts:
  EditorContext created (useMemo)
  context.newGraphInput({ nodes:[], edges:[] })   → setGraph → React state
  onInitialized(context) → VPWidget.setContext    → bridge wired
  │
  ▼
FlowEditor renders with empty graph
ReactFlow.onInit → SceneActions registered, fitView()
```

---

## Part 2: Redraw and Update Mechanisms

### 2.1 User edits the graph (add node, connect edge, change value)

All user interactions in ReactFlow flow through `GraphActions`. The pattern is identical for every mutation type:

```
User drags a node from the search menu
  │
  ▼
GraphActions.addNodeFromSpec(specName, position)
  │  applyGraphChanges([{ type:'add', changedGraph:{ nodes:[newNode], edges:[] } }])
  │
  ▼
applyGraphChanges(changes)                      [GraphActions.ts:238]
  graph = this.graph
  for each change:
      graph = _addElements / _removeElements / _handleSelectAllElements(graph)
  graph = _updateSyncGroups(graph)
  editorContext.blockTriggerRunCode = false      ← arms live execution
  this.stateAction(graph)                        ← React setState(graph)
  │
  ▼
VPEditor state: graph changes
  │
  ▼
useEffect([graph]) → context.updateGraph(graph)
  │  this.graph = graph
  │  graphChangeListeners.forEach(fn => fn(graphWithoutEditorContext(graph)))
  │    → VPWidget.setContent(JSON.stringify(graph))
  │       → model.sharedModel.updateSource(…)   ← persisted to notebook cell
  │  triggerLiveExecution()
  │
  ▼
triggerLiveExecution()                          [EditorContext.ts:174]
  if !blockTriggerRunCode && focused && isLiveExecution && getGraphToBeExecuted()
      onLiveExecution()                          ← VPWidget.run()
  │
  ▼
React re-render: FlowEditor receives new graph.nodes / graph.edges
ReactFlow diffs and updates the canvas
```

### 2.2 Cell execution (manual or live)

```
VPWidget.run()                                  [VPWidget.tsx:154]
  onStartRun()
    → context.notifyExecuteStart()
       runningInProcessCount++
       if count was 0: panels.open('executeInProcess')   ← progress bar appears
  NotebookActions.run(content, sessionContext, …)
  │
  ▼
CodeCell.execute = executeCodeCell              [ExecuteCodeCell.ts:10]
  model.clearExecution()                        ← clears execution count
  cell.outputHidden = false
  code = cell.editor.getCode()
    → VPWidget.getCode() → context.code(increment=true)
       context.getGraphToBeExecuted(increment)
         findCodeChangedGraph(prevExecGraph, currentGraph)  ← incremental diff
       codeGeneratorRegistry.get('Python').codeFromGraph(…)
         topological sort → generateNodeCode for each node
       prevExecGraph = currentGraph              ← snapshot for next increment
  │
  ▼
  OutputArea.execute(code, cell.outputArea, sessionContext)
    ← async; kernel processes code
  │
  ▼
  (await msgPromise) resolves
  model.executionCount = msg.content.execution_count
  │
  ▼
VPWidget.run().finally()
  onEndRun()
    → context.notifyExecuteEnd()
       runningInProcessCount--
       if count reaches 0: panels.close('executeInProcess')  ← progress bar hides
  notebook.content.mode setter restored to normal
```

### 2.3 Inspection data arrives from the kernel

```
Python code sends comm message:
  kernel_comm.send({ handle_id:'editorID_nodeID_handleID', imageUrl:'…', … })
  │
  ▼
VPWidget.listenToInspectResult (registered on kernel 'inspection' target)
                                                [VPWidget.tsx:141]
  comm.onMsg = (msg) => {
      const { handle_id, ...data } = msg.content.data
      updateInspection(handle_id, data)
  }
  │
  ▼
VPWidget.updateInspection(handle_id, data)      [VPWidget.tsx:137]
  context.action('graph').updateInspection(handle_id, data)
  │
  ▼
GraphActions.updateInspection(whichVar, value)  [GraphActions.ts:688]
  [, nodeID, id] = whichVar.split('_')
  stateAction((currentGraph) => ({
      …currentGraph,
      nodes: currentGraph.nodes.map(n => {
          if n.id !== nodeID: return n
          return { …n, data: {
              …n.data,
              inputs:  map inputs  → if id matches: { …item, widget: {…widget, value} }
              outputs: map outputs → if id matches: { …item, widget: {…widget, value} }
          }}
      })
  }))
  │
  ▼
React re-render: only the node whose data changed is updated
  ComputeNode → OutputHandle → useWidget → ImageViewer/HistogramRange/…
  Widget displays updated image or data
  │
  ▼
EditorContext.updateInspection also calls triggerLiveExecution()
  (allows a downstream graph update to kick off if live mode is on)
```

### 2.4 Synchronized image-viewer pan/zoom

When a user pans or zooms an `ImageViewer` widget:

```
ImageViewer pan/zoom event
  │
  ▼
context.updateGlobalTransform({ x, y, zoom, syncGrouptoUpdate })
                                                [EditorContext.ts:254]
  imageViewTransforms[ungrouped | grouped[n]] = { x, y, zoom }
  graphActions.overrideGraph({
      …graph,
      nodes: graph.nodes.map(node => {
          if node has matching syncGroup output: return { …node }  ← force new ref
          return node
      })
  })
  │
  ▼
graphActions.overrideGraph → stateAction(newGraph)
  │
  ▼
React re-render: nodes with matching syncGroup get new object refs
  → ImageViewer reads updated transform from context.getImageViewTransform(syncGroup)
  → Fabric.js canvas is repositioned
```

Creating a shallow copy of the node (`{ ...node }`) with no data change forces React to treat it as changed and re-render the viewer with the new transform.

### 2.5 Mouse-position broadcast (preview overlays)

A similar forced-re-render pattern is used to propagate the current mouse position to all nodes (e.g., for hover-preview effects):

```
context.updateMousePosition({ x, y })           [EditorContext.ts:308]
  mousePosition = { x, y }
  graphActions.overrideGraph({
      …graph,
      nodes: graph.nodes.map(node => ({ …node }))  ← shallow-copy ALL nodes
  })
```

This forces every node to re-render synchronously on each mouse-move event that opts in.

### 2.6 Auto-layout (ELK)

```
User clicks auto-layout button in ControlPanel
  │
  ▼
SceneActions.autoLayout()                       [SceneActions.ts:45]
  nodes = reactFlowInstance.getNodes()
  edges = reactFlowInstance.getEdges()
  elkGraph = { id:'root', layoutOptions:{algorithm:'layered'}, children:[…], edges:[…] }
  await elk.layout(elkGraph)
  │
  ▼
  newNodes = nodes.map(n => { position: elkNode.{x,y} })
  graphActions.overrideGraph({ nodes: newNodes, edges })
  │
  ▼
  window.requestAnimationFrame(() => { await this.fitView() })
```

`overrideGraph` replaces the entire graph state in one `stateAction` call. ReactFlow receives the new `nodes` prop and animates each node to its new position. `fitView` is deferred to the next frame so ReactFlow has time to commit the new positions before the viewport is adjusted.

---

## Redraw Trigger Map

| Event | Triggers `stateAction` via | Result |
|-------|---------------------------|--------|
| User adds/removes/connects node | `applyGraphChanges` | Full graph re-render |
| Widget value changed | `setValue` | Affected node re-renders |
| Inspection data received | `updateInspection` | Affected node re-renders |
| Image viewer pan/zoom | `overrideGraph` (shallow-copy matching nodes) | Only synced viewers re-render |
| Mouse position update | `overrideGraph` (shallow-copy all nodes) | All nodes re-render |
| Auto-layout | `overrideGraph` + `fitView` | All nodes move, viewport fits |
| Cell loaded from disk | `newGraphInput` | Full graph replaced |
| External graph prop change | `useEffect[newGraphInput]` → `newGraphInput` | Full graph replaced |

---

## State Persistence Flow

```
User edits graph
  → applyGraphChanges → stateAction(newGraph)
       ↓ React setState
  useEffect([graph]) fires
       ↓
  context.updateGraph(graph)
       ↓
  graphChangeListeners[0](graphWithoutEditorContext(graph))
       ↓
  VPWidget.setContent(JSON.stringify(graph))
       ↓
  model.sharedModel.updateSource(i, i+CHUNK_SIZE, chunk)  [VPWidget.tsx:83]
       ↓
  Yjs shared document updated → notebook .ipynb source of truth updated
```

`setContent` writes in 20 000-character chunks to avoid hitting Yjs transaction size limits. Each chunk is applied as a separate `updateSource` call but within the same synchronous JS turn, so Yjs batches them.

---

## Key Invariants

1. **Single source of truth**: The graph is owned by React state (`setGraph`). The Yjs cell source and `EditorContext.graph` are derived copies, updated synchronously after each state transition.

2. **Batch updates**: `applyGraphChanges` accumulates multiple logical changes (e.g., deselect-all then add-nodes) into one `stateAction` call, producing one React render instead of N.

3. **Live execution gate**: Three conditions must all be true simultaneously — `!blockTriggerRunCode`, `focused`, `isLiveExecution` — to prevent execution during cell load, when the cell is not active, or when the user has toggled live mode off.

4. **Incremental code generation**: `findCodeChangedGraph(prevExecGraph, currentGraph)` computes the minimal sub-graph that changed since the last execution. Only that portion is sent to the kernel on re-runs, keeping execution fast for large pipelines.

5. **`editorContext` stripped before serialisation**: `graphWithoutEditorContext` removes the circular `editorContext` reference from every node before `JSON.stringify`, then `newGraphInput` re-injects it after deserialization.
