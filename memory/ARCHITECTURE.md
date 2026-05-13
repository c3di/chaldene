# Chaldene — System Architecture

Chaldene is a JupyterLab extension that replaces standard code cells with a visual node-graph editor for image-processing workflows. Users build pipelines by connecting nodes in a React-based canvas; the extension generates Python code from the graph and executes it in the active kernel.

---

## High-Level Layer Map

```
┌──────────────────────────────────────────────────────────┐
│  JupyterLab shell / notebook                             │
│  (standard cells, toolbar, kernel session)               │
├──────────────────────────────────────────────────────────┤
│  Chaldene integration shim          (src/index.ts …)     │
│  ContentFactory · VPEditorFactory · Action overrides     │
├──────────────────────────────────────────────────────────┤
│  Lumino widget layer                (src/VPEditor.ts,    │
│                                      src/VPWidget.tsx)   │
├──────────────────────────────────────────────────────────┤
│  React application                  (src/ReactVP/)       │
│  VPEditor · FlowEditor · ComputeNode · Widgets           │
├──────────────────────────────────────────────────────────┤
│  State & action layer               (src/ReactVP/Actions)│
│  EditorContext · GraphActions · SceneActions · …         │
├──────────────────────────────────────────────────────────┤
│  Code generation                    (src/ReactVP/        │
│                                      CodeGeneration/)    │
├──────────────────────────────────────────────────────────┤
│  Kernel (Python)  ←→  Jupyter comm channel               │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Plugin Registration (`src/index.ts`)

The single JupyterLab plugin `'Chaldene: Add VP Cell'` (`autoStart: true`) patches the lab at startup:

| Hook | What it does |
|------|-------------|
| `toolbarRegistry.addFactory('cellType')` | Injects the cell-type dropdown into every notebook toolbar |
| `notebookWidgetFactory.contentFactory = new ContentFactory(…)` | Replaces the default notebook factory so VP cells get a VP editor |
| `CodeCell.execute = executeCodeCell` | Replaces JupyterLab's execute function to intercept VP cells |
| `NotebookActions.insertBelow/Above = insertBelow/Above` | Overrides insert so new cells default to `'visual code'` |
| `defaultNodeSpecs()` | Registers all built-in image-processing node specifications |

The plugin declares `requires: [IToolbarWidgetRegistry, IEditorServices, INotebookWidgetFactory, INotebookTracker, IFileBrowserFactory]` — no optional tokens.

---

## 2. JupyterLab Integration Shim

### 2.1 `ContentFactory` (`src/ContentFactory.ts`)

Extends `NotebookPanel.ContentFactory`. Responsibilities:

- Creates a `VPNotebook` instead of the stock `Notebook` widget.
- Maintains two editor factories keyed by cell metadata:
  - `'code'` → JupyterLab inline editor factory
  - `'visual code'` → `VPEditorFactory`
- `createCodeCell()` reads `model.getMetadata('code type')` and selects the correct factory before delegating to `super.createCodeCell()`.

### 2.2 `VPEditorFactory` (`src/VPEditorFactory.ts`)

A thin factory function (`(options: CodeEditor.IOptions) => VPEditor`). Sets `host.dataset.type = 'inline'` for layout hints and instantiates `VPEditor`.

### 2.3 `VPNotebook` (`src/VPNotebook.ts`)

Extends JupyterLab's `Notebook`. Overrides mouse-event handling:

- `isVisualCodeCell(widget)` — detects VP cells by querying for `.jp-VPEditor` in the widget DOM.
- `evtMouseDownCapture(event)` — suppresses context-menu events on VP cells to prevent JupyterLab from entering command mode unexpectedly.
- `findCell(node)` / `findEventTargetAndCell(event)` — DOM walk helpers that trace up from any clicked element to the containing `jp-Notebook-cell`, with a Firefox fallback via `document.elementFromPoint`.

### 2.4 `Action.ts` — Insert Overrides

`insertBelow` and `insertAbove` call `model.sharedModel.insertCell(index, { cell_type: 'code', metadata: { 'code type': 'visual code' } })`. Every newly inserted cell is therefore always a VP cell; the metadata is the discriminator used by `ContentFactory`.

---

## 3. Lumino Widget Layer

### 3.1 `VPEditor` (`src/VPEditor.ts`)

Implements `CodeEditor.IEditor` so JupyterLab treats the VP editor as a drop-in replacement for CodeMirror. Key members:

| Member | Role |
|--------|------|
| `host` | The DOM element JupyterLab provides for the editor |
| `getCode()` | Delegates to `VPWidget.getCode()` → code generator |
| `model` | The `CodeEditor.IModel` backed by the shared notebook document |
| `edgeRequested` | Lumino signal (stub; required by the interface) |
| `_editor` (VPWidget) | The actual React-based widget |

The constructor calls `createVPWidget(uuid, model, host, notebookPanel, fileBrowser)` immediately, attaching it one animation frame later (see §3.2).

### 3.2 `VPWidget` (`src/VPWidget.tsx`)

Extends Lumino's `ReactWidget`. This is the bridge between Lumino's widget lifecycle and React.

**Constructor** sets up:
- `focusout` listener — stops propagation when `_focused`, preventing the notebook from stealing focus.
- `contextmenu` listener — always swallowed so the VP context menu can work.
- Capture-phase `wheel` listener — blocks scroll propagation when the editor is not focused.

**`createVPWidget()`** (exported factory, line 204):
```
new VPWidget(…)
→ host.style.{height, overflow, resize}
→ window.requestAnimationFrame(() => Widget.attach(editor, host))
```
The `requestAnimationFrame` defers Lumino's `Widget.attach` to after the current layout pass so the host element has definite dimensions before React renders.

**`render()`** returns `<VPEditor id graph onInitialized />` — the root React component.

**`setContext(context)`** wires the React world back to Lumino:
- `context.addGraphChangeListener(graph => setContent(JSON.stringify(graph)))` — persists every graph change to the cell source.
- `context.onLiveExecution = this.run.bind(this)` — runs the notebook cell on live-execution triggers.
- Focus/blur callbacks update `_focused`.

**`run()`** (line 154):
1. Temporarily monkey-patches `notebookPanel.content.mode` setter to a no-op to prevent the cell from jumping to edit mode mid-execution.
2. Calls `NotebookActions.run(…)`.
3. Restores `mode` in `finally`.

---

## 4. React Application (`src/ReactVP/`)

### 4.1 Component Tree

```
VPEditor (VPEditor.tsx)
├─ EditorContext  (useMemo — one instance per editor lifetime)
├─ {menu}        (dynamic context menu, null when closed)
├─ {panels[]}    (dynamic floating panels)
└─ FlowEditor (FlowEditor.tsx)
   └─ ReactFlowProvider
      └─ ReactFlow
         ├─ [nodeTypes] → ComputeNode (Components/ComputeNode.tsx)
         │               ├─ InputHandle  (Components/Handle.tsx)
         │               │  └─ useWidget → widget component
         │               └─ OutputHandle (Components/Handle.tsx)
         │                  └─ useWidget → widget component
         ├─ {focused && ControlPanel}
         └─ Background (dots)
```

### 4.2 `VPEditor` Component (`src/ReactVP/VPEditor/VPEditor.tsx`)

Owns four React state variables:

| State | Type | Driven by |
|-------|------|-----------|
| `graph` | `Graph \| undefined` | `GraphActions.stateAction` |
| `focused` | `boolean` | `FocusTracker.stateAction` |
| `menu` | `GUIElement` | `MenuActions.stateAction` |
| `panels` | `GUIElement[]` | `PanelActions.stateAction` |

`EditorContext` is created once via `useMemo([], [])` so it is stable across re-renders. The four state setters are injected into it at construction.

Three `useEffect` hooks:
- `[newGraphInput]` — calls `context.newGraphInput(graph)` when the graph prop changes (cell loaded or external edit).
- `[graph]` — calls `context.updateGraph(graph)` when the graph state changes (any user edit).
- `[context]` — calls `onInitialized(context)` once to hand the context to `VPWidget`.

### 4.3 `FlowEditor` Component (`src/ReactVP/VPEditor/FlowEditor.tsx`)

Stateless — receives `graph` and passes `graph.nodes` / `graph.edges` directly to `<ReactFlow>`. All mutation goes through `GraphActions` callbacks passed as `onNodesChange`, `onEdgesChange`, `onConnect`, etc.

`onInit` registers a `SceneActions` instance with the live ReactFlow instance, then calls `fitView()`.

`ControlPanel` is conditionally rendered only when `focused === true`, avoiding unnecessary DOM when the cell is not active.

### 4.4 `ComputeNode` (`src/ReactVP/Components/ComputeNode.tsx`)

Each node in the ReactFlow canvas is rendered by this component. It receives `id`, `data` (typed as `INodeData`), and `selected` from ReactFlow. It maps `data.inputs` to `InputHandle` components on the left and `data.outputs` to `OutputHandle` components on the right.

Node border color transitions on selection via `transition: 'border-color 0.1s ease-in-out'` (inline style, line 86).

### 4.5 `Handle` Components (`src/ReactVP/Components/Handle.tsx`)

`InputHandle` and `OutputHandle` each call `useWidget(…)` to render the appropriate widget (if any) alongside the ReactFlow connection point. The `useWidget` hook looks up the widget type in `editorContext.widgetRegistry` and returns the registered React component.

---

## 5. State and Action Layer (`src/ReactVP/Actions/`)

### 5.1 `EditorContext` (`src/ReactVP/EditorContext.ts`)

The central singleton per editor instance. It is not a React context; it is a plain class passed through `data.editorContext` on every node and through props. Key fields:

| Field | Purpose |
|-------|---------|
| `graph?: Graph` | Current authoritative graph (set by `updateGraph`) |
| `graphChangeListeners[]` | Callbacks that persist the graph to the notebook cell |
| `blockTriggerRunCode` | Gate: `true` on load, set to `false` by `applyGraphChanges` |
| `isLiveExecution` | Whether execution fires automatically on graph change |
| `prevExecGraph` | Snapshot used for incremental code generation |
| `runningInProcessCount` | Tracks concurrent executions; drives the progress panel |
| `imageViewTransforms` | Shared pan/zoom state across ImageViewer widgets |

Key methods:

- **`updateGraph(graph)`** — sets `this.graph`, calls all `graphChangeListeners`, and calls `triggerLiveExecution()`.
- **`triggerLiveExecution()`** — fires `onLiveExecution()` only when `!blockTriggerRunCode && focused && isLiveExecution && getGraphToBeExecuted() != null`.
- **`code(increment)`** — calls the registered code generator, optionally restricting to the changed sub-graph (`findCodeChangedGraph(prevExecGraph, graph)`), then snapshots `prevExecGraph = graph`.
- **`notifyExecuteStart/End()`** — increments/decrements `runningInProcessCount`; opens/closes the `executeInProcess` panel.

### 5.2 `StateActions` (`src/ReactVP/Actions/StateActions.ts`)

Base class for all action classes. Holds a single `stateAction` function (i.e., a React `setState` dispatcher) and a back-reference to `EditorContext` (set by `registAction`).

### 5.3 `GraphActions` (`src/ReactVP/Actions/GraphActions.ts`)

The most substantial action class. All graph mutations funnel through:

```
applyGraphChanges(changes: GraphChange[])
  → _addElements / _removeElements / _handleSelectAllElements
  → _updateSyncGroups
  → editorContext.blockTriggerRunCode = false
  → this.stateAction(newGraph)   ← React setState
```

This ensures a single React state update per logical operation (batching is explicit, not relying on React's automatic batching). Setting `blockTriggerRunCode = false` arms live execution for the next `updateGraph` call.

Other notable methods:
- `newGraphInput(graph)` — called on cell load; injects `editorContext` reference into each node's data.
- `applyNodeChanges(changes)` — passes only `dimensions`, `select`, and `position` changes to `stateAction` (ignores `remove` from ReactFlow to keep deletion under application control).
- `applyEdgeChanges(changes)` — passes only `select` changes.
- `updateInspection(whichVar, value)` — parses the `editorID_nodeID_handleID` string and updates `widget.value` in the matching handle, triggering a re-render of the output widget.
- `setValue(category, identifier, value)` — updates a widget's `defaultValue` in the graph, arming live execution.

### 5.4 `SceneActions` (`src/ReactVP/Actions/SceneActions.ts`)

Wraps the ReactFlow instance (registered after `onInit`). Provides:
- `fitView()` — frames all nodes.
- `focusOn(nodeID)` — animates pan/zoom to a specific node.
- `autoLayout()` — computes a hierarchical layout with ELK, updates node positions via `graphActions.overrideGraph(newGraph)`, and calls `fitView()` in a `requestAnimationFrame`.

### 5.5 `FocusTracker` (`src/ReactVP/Actions/FocusTracker.ts`)

Detects focus by listening to `mousedown` on the document during the capture phase while a drag is in progress. Sets `context.focused`, calls `context.onFocus` / `context.onBlur`, and dispatches to the `focused` state setter in `VPEditor`.

### 5.6 `MenuActions` / `PanelActions`

Both maintain their state through the corresponding `setState` dispatchers from `VPEditor`. They render named component types from `editorContext.menuComponents` / `editorContext.panelComponents` registries, passing runtime props. Opening a panel that already exists (by type) updates its props in-place rather than adding a duplicate.

---

## 6. Code Generation (`src/ReactVP/CodeGeneration/`)

### Registry pattern

`CodeGeneratorRegistry` maps language names (currently `'Python'`) to `CodeGenerator` instances. `EditorContext.codeGeneratorRegistry` holds this and is queried by `EditorContext.code()`.

### `CodeGenerator.codeFromGraph(editorID, graph, inspect_included)`

Entry point. Detects a `batch_process` node and routes to `codeFromBatchProcess`; otherwise calls `codeFromSubGraph`.

`codeFromSubGraph`:
1. Topologically sorts nodes.
2. For each node, calls `generateNodeCode(editorID, node, incomingEdges, inspect_included)`.
3. Concatenates the results.

`generateNodeCode`:
1. Resolves each input: either the variable name produced by the connected upstream node, or the handle's `defaultValue`.
2. Generates unique output variable names via `uniqueHandleName(editorID, node.id, handle.id)`.
3. Calls the node's registered `NodeCodeGenerator` function with `inputValues` and `outputValues` dictionaries.
4. Appends inspection-capture calls (image comm sends, histogram captures).

### Node code generators

Each node spec registers a function `(inputValues, outputValues) => string` that returns Python code. The generator receives dictionary entries keyed by handle ID.

---

## 7. Execution Flow

```
User triggers run  (live or manual)
       │
       ▼
VPWidget.run()
  patches notebook.mode setter (no-op) to prevent mode jump
  calls NotebookActions.run(…)
       │
       ▼
CodeCell.execute = executeCodeCell  (src/ExecuteCodeCell.ts)
  model.clearExecution()            ← clears previous outputs
  cell.outputHidden = false
  code = cell.editor.getCode()      ← calls EditorContext.code()
  OutputArea.execute(code, cell.outputArea, sessionContext)
       │
       ▼  (asynchronous — kernel processes code)
Kernel sends comm messages ('inspection' target)
       │
       ▼
VPWidget.listenToInspectResult (registered on kernel)
  comm.onMsg → updateInspection(handle_id, data)
       │
       ▼
GraphActions.updateInspection
  updates widget.value in matching handle
  → stateAction(newGraph)
       │
       ▼
React re-render — widget components display updated images/data
```

**Execution readiness gate** (`EditorContext.checkExecutionReadiness`): if any non-connected, non-defaulted input exists, the `notReadyNodePanel` is opened and execution is aborted.

---

## 8. Kernel Communication (Inspection)

The Python code generated for image and histogram outputs includes comm-send calls:

```python
kernel_comm.send({
    'handle_id': 'editorID_nodeID_handleID',
    'imageUrl': '<base64>',
    'dimensions': { 'width': …, 'height': … }
})
```

The frontend registers a handler for the `'inspection'` comm target in `VPWidget.listenToInspectResult`. On each message, `handle_id` is split on `_` to extract `nodeID` and `handleID`, and `GraphActions.updateInspection` patches the in-memory graph. Because this triggers `stateAction`, React re-renders only the affected node.

---

## 9. Node Specification System (`src/NodeSpec/` + `src/ReactVP/Spec/`)

Built-in specs are registered at startup via `defaultNodeSpecs()`. Each spec describes:
- **Inputs / outputs**: handle names, types (`Image`, `Number`, `String`, …), optional widget type.
- **Display label** and description.
- **Code generator**: the `(inputValues, outputValues) => string` function.
- **ReactFlow node type**: maps spec name to `ComputeNode` (or custom component).

`NodeSpecRegistry` holds all specs and exposes `allVisualNodeTypes` (the map passed to ReactFlow's `nodeTypes` prop) and `allNodeSpecs` (used by the search menu).

---

## 10. Widget System (`src/ReactVP/Widgets/`)

Output and input handles can carry inline widgets. Registered in `widgetsRegistry`:

| Widget | Handle side | Data source |
|--------|-------------|-------------|
| `ImageViewer` | Output | Base64 image from kernel comm |
| `ImageGallery` | Input | Folder of images; Fabric.js canvas |
| `ImageCropper` | Input | Crop region; driven by inspection |
| `HistogramRange` | Input | Range slider; histogram from kernel |
| Standard inputs (`number`, `text`, `range`) | Input | `defaultValue` in graph |

`useWidget` (hook in `Components/UseWidget.tsx`) looks up the widget component, passes `setValue` (→ `GraphActions.setValue`) and the current `defaultValue`.

---

## 11. CSS / Style Layer (`style/`)

| File | Scope |
|------|-------|
| `index.css` | Entry point — imports all others |
| `style.css` | CSS custom properties (`--vpl-*`): shadows, colours, typography |
| `base.css` | Global overrides (ReactFlow selection rect, progress-bar animation) |
| `handle.css` | Handle layout, connected/disconnected/hover states |
| `imageViewer.css` | Image viewer canvas and fullscreen button |
| `imageGallery.css` | Gallery thumbnail grid and controls |
| `imageCropper.css` | Crop overlay and dialog |
| `input.css` | Text, number, range, file-input widgets |
| `controlPanel.css` | Toolbar panel (auto-layout, live mode toggle) |
| `contextMenu.css` | Context menu container |
| `menuItem.css` | Individual menu items |
| `searchMenu.css` | Search/add-node accordion |

---

## 12. Key Data Types (`src/ReactVP/Type/`)

```typescript
interface Graph {
  nodes: Node[];   // ReactFlow node with INodeData
  edges: Edge[];   // ReactFlow edge (standard)
}

interface INodeData {
  displayLabel?: string;
  description?: string;
  specName?: string;
  inputs?: IHandle[];
  outputs?: IHandle[];
  editorContext?: EditorContext;  // injected at runtime; stripped before JSON serialization
  extraRun?: number;
  sourceChanged?: boolean;
}

interface IHandle {
  id: string;
  name: string;
  type: string;          // 'Image' | 'Number' | 'String' | …
  widget?: IWidget;      // optional inline widget spec
  defaultValue?: any;
  connections?: number;  // tracks connection count for styling
}

type ExecuteStatus = 'in process' | 'finished' | 'cancelled';
```

`editorContext` on each node is stripped by `graphWithoutEditorContext(graph)` before the graph is serialised into the notebook cell source, preventing circular-reference errors in `JSON.stringify`.

---

## 13. External Libraries

| Library | Version | Role |
|---------|---------|------|
| `@xyflow/react` | latest | Node-graph canvas (ReactFlow) |
| `fabric` | 6.x | Canvas rendering for ImageViewer, ImageGallery |
| `elkjs` | latest | Hierarchical auto-layout for SceneActions |
| `react-image-crop` | latest | Crop rectangle UI in ImageCropper |
| `@lumino/widgets` | (JupyterLab) | Widget lifecycle, ReactWidget |
| `@jupyterlab/cells` | (JupyterLab) | CodeCell, OutputArea |
| `@jupyterlab/notebook` | (JupyterLab) | Notebook, NotebookActions |
