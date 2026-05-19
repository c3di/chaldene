"""
Build token_api_tutorial.ipynb — a live demonstration notebook.
Run with: python api_tutorials/build_tutorial_notebook.py  (from repo root)
"""
import json, uuid

def mid():
    """Deterministic-ish UUID for stable cell IDs."""
    return str(uuid.uuid4())

def md(source):
    return {"cell_type": "markdown", "id": mid(), "metadata": {},
            "source": source if isinstance(source, list) else [source]}

def code(source, metadata=None):
    lines = source if isinstance(source, list) else source.splitlines(keepends=True)
    return {"cell_type": "code", "id": mid(),
            "metadata": metadata or {},
            "outputs": [], "execution_count": None,
            "source": lines}

def vp_cell(graph: dict):
    """A visual programming cell whose source is compact graph JSON."""
    return {"cell_type": "code", "id": mid(),
            "metadata": {"code type": "visual code"},
            "outputs": [], "execution_count": None,
            "source": [json.dumps(graph, separators=(',', ':'))]}

# ── Node / edge constructors ─────────────────────────────────────────────────

def handle(hid, name, htype=None, label=None, default=None, widget=None, desc=None):
    h = {"id": hid, "name": name}
    if htype:   h["type"] = htype
    if label:   h["displayLabel"] = label
    if desc:    h["description"] = desc
    if default is not None: h["defaultValue"] = default
    if widget:  h["widget"] = widget
    return h

def node(nid, spec, label, inputs, outputs, x=100, y=150, desc=None):
    return {
        "id": str(nid),
        "type": spec,
        "position": {"x": x, "y": y},
        "selected": False,
        "data": {
            "specName": spec,
            "displayLabel": label,
            **({"description": desc} if desc else {}),
            "inputs": inputs,
            "outputs": outputs,
        }
    }

def edge(eid, src, src_h, tgt, tgt_h):
    return {"id": str(eid), "source": str(src), "sourceHandle": src_h,
            "target": str(tgt), "targetHandle": tgt_h, "selected": False}

# ── Graph definitions ────────────────────────────────────────────────────────

READ_IMAGE_NODE = node(
    0, "read_image", "read image",
    inputs=[
        handle("in0", "path", "string", "file",
               default="sample.png",
               desc="Path to a JPEG or PNG image.",
               widget={"type": "FileInputFromServer",
                       "extensions": [".jpg", ".jpeg", ".png"]}),
        handle("in1", "mode", label="mode",
               desc="Colour mode. GRAY produces a single-channel float image.",
               default="GRAY",
               widget={"type": "Dropdown", "options": ["GRAY", "RGB"]}),
    ],
    outputs=[handle("out0", "image", "image", "image",
                    desc="The loaded image.",
                    widget={"type": "ImageViewer", "showDiff": False, "isBinary": False})],
    desc="Reads a JPEG or PNG image from disk.",
    x=100, y=150)

BINARIZE_NODE = node(
    1, "auto binarize", "auto binarize",
    inputs=[handle("in0", "image", "image", "image",
                   desc="Grayscale input image.")],
    outputs=[handle("out0", "image", "binary image", "image",
                    desc="Binary output image.",
                    widget={"type": "ImageViewer", "showDiff": False, "isBinary": True})],
    desc="Automatically binarizes using Otsu thresholding.",
    x=550, y=150)

THRESHOLD_NODE = node(
    1, "threshold", "threshold",
    inputs=[
        handle("in0", "image", "image", "grayscale image",
               desc="Input image for thresholding."),
        handle("in1", "range", "tuple2", "Range",
               default=[0.2, 0.8],
               desc="Lower and upper threshold bounds.",
               widget={"type": "HistogramRange", "min": 0, "max": 1, "step": 0.01}),
    ],
    outputs=[handle("out0", "image", "binary image",
                    desc="Binary result of thresholding.",
                    widget={"type": "ImageViewer", "showDiff": False, "isBinary": True})],
    desc="Binarizes by keeping pixels within [lower, upper].",
    x=550, y=150)

GRAPH_SINGLE = {"nodes": [READ_IMAGE_NODE], "edges": []}

GRAPH_BINARIZE = {
    "nodes": [READ_IMAGE_NODE, BINARIZE_NODE],
    "edges": [edge(0, 0, "out0", 1, "in0")]
}

GRAPH_THRESHOLD = {
    "nodes": [READ_IMAGE_NODE, THRESHOLD_NODE],
    "edges": [edge(0, 0, "out0", 1, "in0")]
}

# ── Notebook cells ───────────────────────────────────────────────────────────

cells = []

# ── Title ────────────────────────────────────────────────────────────────────
cells.append(md("""\
# Chaldene Token API — Live Demonstration

This notebook **runs live in JupyterLab** with the Chaldene extension installed. Each section
demonstrates one method of the `IChaldeneService` token API that lets external JupyterLab
extensions interact with visual programming (VP) cells programmatically.

> **How to use**: Run cells top-to-bottom with Shift+Enter.
> VP cells render as interactive node-graph canvases — you can drag nodes around while the API
> demo cells read and write to the same graph.
"""))

# ── Prerequisites ────────────────────────────────────────────────────────────
cells.append(md("""\
## Prerequisites

- JupyterLab with Chaldene installed (`pip install chaldene` then restart JupyterLab)
- Run cells **in order** — later cells reference values set by earlier ones

The `%%javascript` cells call the `IChaldeneService` API directly via `window.__chaldene`,
which Chaldene exposes for notebook interaction and browser console debugging.
"""))

# ── Sample image creation ────────────────────────────────────────────────────
cells.append(md("""\
---
## Setup — Create sample image

Run this cell once to create `sample.png`, the grayscale test image used throughout
this tutorial. Re-run it any time you need to reset the file.
"""))

cells.append(code("""\
from PIL import Image
import numpy as np

arr = np.random.default_rng(42).integers(0, 256, (256, 256), dtype=np.uint8)
Image.fromarray(arr, mode="L").save("sample.png")
print("sample.png ready (256x256 grayscale)")
"""))

# ── Setup check ──────────────────────────────────────────────────────────────
cells.append(md("---\n## Step 0 — Verify Chaldene is active"))

cells.append(code("""\
%%javascript
const svc = window.__chaldene;
if (!svc) {
    element.innerHTML = '<b style="color:red">✗ Chaldene service not found.</b>'
        + '<br>Install the extension and reload JupyterLab, then run this cell again.';
} else {
    const ids = svc.getReadyCellIds();
    element.innerHTML = '<b style="color:green">✓ Chaldene service is ready.</b>'
        + `<br>Currently tracking <b>${ids.length}</b> VP cell(s).`;
    window.__svc = svc;   // cache for subsequent cells
}
"""))

# ── Section 1: isCellReady / getReadyCellIds ─────────────────────────────────
cells.append(md("""\
---
## Step 1 — Discovery: `isCellReady` and `getReadyCellIds`

Below is a Chaldene VP cell containing a single **read image** node.
When you run it, you should see the interactive node-graph canvas appear.
"""))

cells.append(vp_cell(GRAPH_SINGLE))

cells.append(md("""\
Run the API cell below **after** the VP cell above has rendered (the canvas should be visible).
"""))

cells.append(code("""\
%%javascript
const svc = window.__svc;

// List every VP cell that is currently live
const ids = svc.getReadyCellIds();
let html = `<b>getReadyCellIds()</b> → ${ids.length} cell(s):<br>`;
ids.forEach((id, i) => {
    const ready = svc.isCellReady(id);
    html += `<code style="display:block;margin:2px 0">[${i}] ${id} — isCellReady: ${ready}</code>`;
});
element.innerHTML = html;

// Store the LAST registered cell ID for use in subsequent steps
// (later cells in the notebook register after earlier ones)
window.__cellId = ids[ids.length - 1];
"""))

# ── Section 2: getGraph ──────────────────────────────────────────────────────
cells.append(md("""\
---
## Step 2 — Reading state: `getGraph`

`getGraph(cellId)` returns a snapshot of the cell's current node graph.
The returned object is a plain `{ nodes, edges }` value — safe to inspect and serialise.
"""))

cells.append(code("""\
%%javascript
const svc = window.__svc;
const cellId = window.__cellId;

const graph = svc.getGraph(cellId);
if (!graph) {
    element.textContent = 'getGraph returned undefined — is the cell ready?';
} else {
    let html = `<b>getGraph("${cellId.slice(0,8)}…")</b><br><br>`;
    html += `Nodes: ${graph.nodes.length} &nbsp; Edges: ${graph.edges.length}<br><br>`;
    graph.nodes.forEach(n => {
        const inputs = (n.data.inputs || [])
            .map(h => `${h.id} (${h.name}) = ${JSON.stringify(h.defaultValue ?? '—')}`)
            .join('<br>    ');
        html += `<b>node[${n.id}]</b> type="${n.type}"<br>    ${inputs}<br><br>`;
    });
    element.innerHTML = `<pre style="font-size:11px;line-height:1.4">${html}</pre>`;
}
"""))

# ── Section 3: setGraph ──────────────────────────────────────────────────────
cells.append(md("""\
---
## Step 3 — Replacing a graph: `setGraph`

`setGraph(cellId, graph)` replaces the entire node graph **without unmounting the canvas**.
This is the key benefit over the old remove-and-recreate pattern: no flicker, no lost scroll
position, no lost selection.

After running the cell below, look at the VP cell in Step 1 — a second **auto binarize**
node should appear and connect to the read image node.
"""))

cells.append(code("""\
%%javascript
const svc = window.__svc;
const cellId = window.__cellId;

// New graph: read_image → auto binarize
const newGraph = {
    nodes: [
        {
            id: '0', type: 'read_image', position: { x: 100, y: 150 },
            selected: false,
            data: {
                specName: 'read_image', displayLabel: 'read image',
                description: 'Reads a JPEG or PNG image from disk.',
                inputs: [
                    { id: 'in0', name: 'path', type: 'string', displayLabel: 'file',
                      defaultValue: 'sample.png',
                      widget: { type: 'FileInputFromServer',
                                extensions: ['.jpg', '.jpeg', '.png'] } },
                    { id: 'in1', name: 'mode', displayLabel: 'mode', defaultValue: 'GRAY',
                      widget: { type: 'Dropdown', options: ['GRAY', 'RGB'] } }
                ],
                outputs: [{ id: 'out0', name: 'image', type: 'image', displayLabel: 'image',
                            widget: { type: 'ImageViewer', showDiff: false, isBinary: false } }]
            }
        },
        {
            id: '1', type: 'auto binarize', position: { x: 550, y: 150 },
            selected: false,
            data: {
                specName: 'auto binarize', displayLabel: 'auto binarize',
                description: 'Automatically binarizes using Otsu thresholding.',
                inputs: [{ id: 'in0', name: 'image', type: 'image', displayLabel: 'image' }],
                outputs: [{ id: 'out0', name: 'image', type: 'binary image',
                            displayLabel: 'image',
                            widget: { type: 'ImageViewer', showDiff: false, isBinary: true } }]
            }
        }
    ],
    edges: [
        { id: '0', source: '0', sourceHandle: 'out0',
          target: '1', targetHandle: 'in0', selected: false }
    ]
};

const ok = svc.setGraph(cellId, newGraph);
element.textContent = ok
    ? '✓ Graph updated — look at the VP cell in Step 1. "auto binarize" has been added.'
    : '✗ setGraph returned false — cell not ready.';
"""))

# ── Section 4: setInputValue ─────────────────────────────────────────────────
cells.append(md("""\
---
## Step 4 — Updating a parameter: `setInputValue`

`setInputValue(cellId, nodeId, handleId, value)` changes a single input handle
without touching the rest of the graph. It is the right tool for parameter sweeps or
any situation where only a value changes and the topology stays the same.

The VP cell below contains a **read image → threshold** pipeline. Run it, then
use the API cell to move the threshold range from `[0.2, 0.8]` to `[0.45, 0.90]`.
"""))

cells.append(vp_cell(GRAPH_THRESHOLD))

cells.append(code("""\
%%javascript
const svc = window.__svc;

// After running the VP cell above, it becomes the most recently registered cell.
const ids = svc.getReadyCellIds();
window.__threshCellId = ids[ids.length - 1];
const cellId = window.__threshCellId;

// node '1' (threshold), handle 'in1' (range) — change from [0.2, 0.8] to [0.45, 0.90]
const newRange = [0.45, 0.90];
const ok = svc.setInputValue(cellId, '1', 'in1', newRange);
element.textContent = ok
    ? `✓ Threshold range set to [${newRange}]. Look at the Range widget in the VP cell above — it should have moved.`
    : '✗ setInputValue returned false — cell not ready.';
"""))

# ── Section 5: run ───────────────────────────────────────────────────────────
cells.append(md("""\
---
## Step 5 — Triggering execution: `run`

`run(cellId)` executes the VP cell — it generates Python code from the node graph
and sends it to the kernel, identical to pressing Shift+Enter on the cell.

Note: `setGraph` and `setInputValue` intentionally do **not** auto-execute. Call
`run()` explicitly when you want results.
"""))

cells.append(code("""\
%%javascript
const svc = window.__svc;
const cellId = window.__threshCellId;

// First confirm the graph is what we expect
const graph = svc.getGraph(cellId);
const rangeHandle = graph?.nodes.find(n => n.id === '1')?.data?.inputs?.find(h => h.id === 'in1');
const currentRange = rangeHandle?.defaultValue;

svc.run(cellId);
element.textContent = `✓ Execution triggered for cell ${cellId.slice(0,8)}…`
    + `\\nThreshold range at time of run: ${JSON.stringify(currentRange)}`
    + '\\n(Check the kernel output below the VP cell — kernel must be running.)';
"""))

# ── Section 6: graphChanged ──────────────────────────────────────────────────
cells.append(md("""\
---
## Step 6 — Observing changes: `graphChanged` signal

`graphChanged` fires every time the user edits the graph interactively in the UI.
Connect a handler to keep external state in sync with the cell.

Run the cell below, then **drag a node in any VP cell** — you should see the signal
fire and display the updated node/edge count.

> The handler disconnects itself after 90 seconds to prevent memory leaks in this demo.
"""))

cells.append(code("""\
%%javascript
const svc = window.__svc;
let count = 0;

function onGraphChanged(sender, { cellId, graph }) {
    count++;
    element.innerHTML = [
        `<b>graphChanged fired ${count} time(s)</b>`,
        `<div style="margin:4px 0;font-family:monospace;font-size:11px">`,
        `  cellId : ${cellId}<br>`,
        `  nodes  : ${graph.nodes.length}<br>`,
        `  edges  : ${graph.edges.length}<br>`,
        `  types  : [${graph.nodes.map(n => n.type).join(', ')}]`,
        `</div>`
    ].join('');
}

svc.graphChanged.connect(onGraphChanged);
element.innerHTML = '<i>Listening for graph changes — drag a node in any VP cell above…</i>';

setTimeout(() => {
    svc.graphChanged.disconnect(onGraphChanged);
    element.innerHTML += '<br><i style="color:#888">(listener disconnected after 90 s)</i>';
}, 90000);
"""))

# ── Section 7: cellReady / cellDisposed ──────────────────────────────────────
cells.append(md("""\
---
## Step 7 — Lifecycle signals: `cellReady` and `cellDisposed`

`cellReady` fires when a new VP cell mounts and registers with the service.
`cellDisposed` fires when a VP cell is deleted or the notebook panel closes.

Run the listener below, then **insert a new VP cell** in the notebook — you will see
`cellReady` fire. Delete the cell to see `cellDisposed`.

> **Late-caller pattern**: if your extension activates before VP cells are ready,
> subscribe to `cellReady` and apply your pending state inside the handler.
"""))

cells.append(code("""\
%%javascript
const svc = window.__svc;

function onReady(sender, cellId) {
    element.innerHTML += `<div style="color:green">✓ cellReady: <code>${cellId}</code></div>`;
    // Pattern: apply a default graph to every new cell automatically
    // svc.setGraph(cellId, makeDefaultGraph());
}

function onDisposed(sender, cellId) {
    element.innerHTML += `<div style="color:#c00">✗ cellDisposed: <code>${cellId}</code></div>`;
}

svc.cellReady.connect(onReady);
svc.cellDisposed.connect(onDisposed);
element.innerHTML = '<i>Listening for lifecycle events…</i><br>'
    + '<i style="color:#888">Insert or delete a VP cell to see signals fire.</i>';

setTimeout(() => {
    svc.cellReady.disconnect(onReady);
    svc.cellDisposed.disconnect(onDisposed);
    element.innerHTML += '<br><i style="color:#888">(listeners disconnected after 90 s)</i>';
}, 90000);
"""))

# ── Section 8: parameter sweep ───────────────────────────────────────────────
cells.append(md("""\
---
## Bonus — Parameter sweep

The full power of the API shows when you need to run a cell many times with varying
parameters. The cell below sweeps the threshold range across five values, running the
kernel for each one. A real use case: grid-search over processing parameters from an
external optimisation loop or experiment-tracking plugin.

> Requires the kernel to be idle between iterations. This demo inserts a 2-second
> gap between runs; production code should await a proper kernel-idle signal via
> `INotebookTracker`.
"""))

cells.append(code("""\
%%javascript
const svc = window.__svc;
const cellId = window.__threshCellId;

const sweepValues = [
    [0.10, 0.50],
    [0.25, 0.65],
    [0.40, 0.80],
    [0.55, 0.90],
    [0.70, 1.00],
];

let step = 0;
element.innerHTML = `<b>Threshold sweep — ${sweepValues.length} steps</b><br>`;

function runStep() {
    if (step >= sweepValues.length) {
        element.innerHTML += '<br><b>✓ Sweep complete.</b>';
        return;
    }
    const range = sweepValues[step];
    svc.setInputValue(cellId, '1', 'in1', range);
    svc.run(cellId);
    element.innerHTML += `<div style="font-size:11px;margin:2px 0">`
        + `step ${step + 1}: range=[${range}] → run()</div>`;
    step++;
    setTimeout(runStep, 2000);   // wait 2 s between runs
}

runStep();
"""))

# ── Wrap-up ──────────────────────────────────────────────────────────────────
cells.append(md("""\
---
## Summary

| Method | What it does | Returns |
|---|---|---|
| `isCellReady(id)` | Checks if VP canvas is mounted | `boolean` |
| `getReadyCellIds()` | Lists all live VP cell IDs | `string[]` |
| `getGraph(id)` | Reads current node graph (snapshot) | `IGraph \\| undefined` |
| `setGraph(id, graph)` | Replaces graph without unmounting | `boolean` |
| `setInputValue(id, node, handle, val)` | Updates one input value | `boolean` |
| `run(id)` | Executes the cell in the kernel | `void` |
| `cellReady` signal | Fires on VP canvas mount | `cellId: string` |
| `cellDisposed` signal | Fires on VP canvas teardown | `cellId: string` |
| `graphChanged` signal | Fires on every interactive edit | `{ cellId, graph }` |

The service is available at `window.__chaldene` in this notebook and in the browser console.

For building a full JupyterLab extension that consumes the token via dependency injection,
see `src/tokens.ts` in the Chaldene repository and the TypeScript examples in
`token_api_tutorial.ipynb`.
"""))

# ── Assemble notebook ────────────────────────────────────────────────────────
nb = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.10.0"}
    },
    "cells": cells
}

out = "api_tutorials/token_api_tutorial.ipynb"
with open(out, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

# Verify
nb2 = json.load(open(out))
code_cells = sum(1 for c in nb2["cells"] if c["cell_type"] == "code")
vp_cells   = sum(1 for c in nb2["cells"]
                 if c["cell_type"] == "code" and
                 c.get("metadata", {}).get("code type") == "visual code")
js_cells   = sum(1 for c in nb2["cells"]
                 if c["cell_type"] == "code" and
                 "".join(c["source"]).startswith("%%javascript"))
print(f"Written: {out}")
print(f"  Total cells : {len(nb2['cells'])}")
print(f"  Markdown    : {sum(1 for c in nb2['cells'] if c['cell_type'] == 'markdown')}")
print(f"  Code total  : {code_cells}")
print(f"    VP cells  : {vp_cells}  (actual node-graph canvases)")
print(f"    JS cells  : {js_cells}  (live API demos)")
