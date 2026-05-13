"""
Build animated_demo.ipynb — event-driven animation demonstration notebook.
Run with: python api_tutorials/build_animated_demo.py  (from repo root)
"""
import json
import os
import uuid


def mid():
    return str(uuid.uuid4())


def md(source):
    return {"cell_type": "markdown", "id": mid(), "metadata": {},
            "source": source if isinstance(source, list) else [source]}


def code(source, metadata=None):
    lines = source.splitlines(keepends=True) if isinstance(source, str) else source
    return {"cell_type": "code", "id": mid(),
            "metadata": metadata or {},
            "outputs": [], "execution_count": None,
            "source": lines}


def vp(graph):
    return {"cell_type": "code", "id": mid(),
            "metadata": {"code type": "visual code"},
            "outputs": [], "execution_count": None,
            "source": [json.dumps(graph, separators=(',', ':'))]}


# ── VP graph: read_image → Gaussian Blur → threshold ─────────────────────────

GRAPH = {
    "nodes": [
        {
            "id": "0", "type": "read_image",
            "position": {"x": 80, "y": 200}, "selected": False,
            "data": {
                "specName": "read_image", "displayLabel": "read image",
                "description": "Reads a JPEG or PNG image from disk.",
                "inputs": [
                    {"id": "in0", "name": "path", "type": "string",
                     "displayLabel": "file", "description": "Path to image.",
                     "defaultValue": "sample.png",
                     "widget": {"type": "FileInputFromServer",
                                "extensions": [".jpg", ".jpeg", ".png"]}},
                    {"id": "in1", "name": "mode", "displayLabel": "mode",
                     "description": "Colour mode.", "defaultValue": "GRAY",
                     "widget": {"type": "Dropdown", "options": ["GRAY", "RGB"]}}
                ],
                "outputs": [{"id": "out0", "name": "image",
                             "type": "image", "displayLabel": "image"}]
            }
        },
        {
            "id": "1", "type": "read_image",
            "position": {"x": 460, "y": 200}, "selected": False,
            "data": {
                "specName": "Gaussian Blur", "displayLabel": "gaussian denoise",
                "description": "Apply Gaussian blur to remove noise.",
                "inputs": [
                    {"id": "in0", "name": "image", "type": "image",
                     "displayLabel": "image"},
                    {"id": "in1", "name": "sigma", "displayLabel": "sigma",
                     "description": "Standard deviation for Gaussian kernel.",
                     "defaultValue": 1.0,
                     "widget": {"type": "Number", "min": 0, "step": 0.1}},
                    {"id": "in2", "name": "mode", "displayLabel": "mode",
                     "description": "Border handling mode.",
                     "defaultValue": "nearest",
                     "widget": {"type": "Dropdown",
                                "options": ["reflect", "constant", "nearest",
                                            "mirror", "wrap"]}}
                ],
                "outputs": [{"id": "out0", "name": "image",
                             "type": "image", "displayLabel": "image"}]
            }
        },
        {
            "id": "2", "type": "read_image",
            "position": {"x": 840, "y": 200}, "selected": False,
            "data": {
                "specName": "threshold", "displayLabel": "threshold",
                "description": "Binarizes by keeping pixels within [lower, upper].",
                "inputs": [
                    {"id": "in0", "name": "image", "type": "image",
                     "displayLabel": "grayscale image",
                     "description": "Input image for thresholding."},
                    {"id": "in1", "name": "range", "type": "tuple2",
                     "displayLabel": "Range",
                     "description": "Lower and upper threshold bounds.",
                     "defaultValue": [0.2, 0.8],
                     "widget": {"type": "HistogramRange",
                                "min": 0, "max": 1, "step": 0.01}}
                ],
                "outputs": [{"id": "out0", "name": "image",
                             "type": "binary image", "displayLabel": "image"}]
            }
        }
    ],
    "edges": [
        {"id": "e01", "source": "0", "sourceHandle": "out0",
         "target": "1", "targetHandle": "in0", "selected": False},
        {"id": "e12", "source": "1", "sourceHandle": "out0",
         "target": "2", "targetHandle": "in0", "selected": False}
    ]
}

# ── cell sources ──────────────────────────────────────────────────────────────

SETUP = '''\
from PIL import Image
import numpy as np

arr = np.random.default_rng(42).integers(0, 256, (256, 256), dtype=np.uint8)
Image.fromarray(arr, mode='L').save('sample.png')
print('sample.png ready (256×256 grayscale)')
'''

JS_LISTENER = '''%%javascript
const svc = window.__chaldene;
if (!svc) {
    element.innerHTML = '<b style="color:red">✗ Chaldene not found — install and reload.</b>';
} else {
    window.__svc = svc;
    window.__animCellId = svc.getReadyCellIds().slice(-1)[0];

    // Safe to re-run: remove the old handler before registering a new one
    if (window.__animListener) {
        window.removeEventListener('chaldene:start-animation', window.__animListener);
    }

    window.__animListener = (event) => {
        const { frames } = event.detail;
        const cellId = window.__animCellId;
        let step = 0;

        // Write to element ONCE at start and ONCE at end only.
        // Per-frame updates cause JupyterLab to scroll to this cell on every
        // tick, pulling the VP canvas out of view.
        element.innerHTML =
            '<b>Animation running — ' + frames.length + ' frames × 1 s</b><br>' +
            '<i style="color:#555">Watch the VP canvas in Step 1 while this plays.</i>';

        function tick() {
            if (step >= frames.length) {
                element.innerHTML =
                    '<b style="color:green">✓ Animation complete (' + frames.length + ' frames).</b>';
                return;
            }
            const f = frames[step];
            svc.setInputValue(cellId, '1', 'in1', f.sigma);
            svc.setInputValue(cellId, '2', 'in1', f.range);
            svc.run(cellId);
            step++;
            setTimeout(tick, 1000);
        }

        tick();
    };

    window.addEventListener('chaldene:start-animation', window.__animListener);
    element.innerHTML = '<b style="color:#555">✓ Listener ready.</b> Run Step 3 to start.';
}
'''

ANIMATION = '''\
import json
from IPython.display import Javascript, display

# 20 frames: sigma ramps 0.5 → 5.25 while threshold window narrows
frames = [
    {
        'sigma': round(0.5 + i * 0.25, 2),
        'range': [round(0.05 + i * 0.04, 2), round(0.95 - i * 0.02, 2)]
    }
    for i in range(20)
]

for i, f in enumerate(frames):
    print(f'frame {i+1:2d}: sigma={f["sigma"]:.2f}  range={f["range"]}')

display(Javascript(f"""
window.dispatchEvent(new CustomEvent('chaldene:start-animation', {{
    detail: {{ frames: {json.dumps(frames)} }}
}}));
"""))
'''

# ── assemble notebook ─────────────────────────────────────────────────────────

cells = [
    md(
        "# Chaldene Animation Demo — Event-Driven Pipeline\n"
        "\n"
        "This notebook shows how a **Python program** drives a Chaldene VP cell\n"
        "through an animated sequence:\n"
        "\n"
        "1. A Python cell computes 20 parameter frames for the pipeline.\n"
        "2. It dispatches a `CustomEvent` to the JupyterLab frontend via"
        " `IPython.display.Javascript`.\n"
        "3. A pre-registered JavaScript listener receives the event and steps through\n"
        "   the frames at **one-second intervals**, calling `setInputValue` + `run`"
        " on each tick.\n"
        "\n"
        "**Pipeline:** `read image → Gaussian Blur (sigma) → threshold (range)`\n"
        "\n"
        "> Run cells in order with Shift+Enter."
    ),

    code(SETUP),

    md(
        "---\n"
        "## Step 1 — The VP pipeline\n"
        "\n"
        "Run this cell to open the visual canvas. The three-node pipeline will be\n"
        "animated in Step 3: sigma ramps 0.5 → 5.25 while the"
        " threshold window narrows step by step."
    ),

    vp(GRAPH),

    md(
        "---\n"
        "## Step 2 — Register the animation listener\n"
        "\n"
        "This cell registers a `chaldene:start-animation` event handler on the browser\n"
        "window. It stays idle until Step 3 fires the event.\n"
        "Re-running this cell is safe — the old handler is removed first."
    ),

    code(JS_LISTENER),

    md(
        "---\n"
        "## Step 3 — Run the Python program\n"
        "\n"
        "This is the **Jupyter program**: it builds the 20 parameter frames, prints\n"
        "a summary table, then fires `chaldene:start-animation` with the data.\n"
        "The listener picks it up and animates the VP cell one frame per second."
    ),

    code(ANIMATION),

    md(
        "---\n"
        "## How it works\n"
        "\n"
        "```\n"
        "Python cell                  JupyterLab frontend\n"
        "────────────"
        "────────             "
        "────────────"
        "────────────"
        "────────────"
        "────\n"
        "build frames[]               VP cell rendered (Step 1)\n"
        "   │                            │\n"
        "display(Javascript)  ─────►"
        "  CustomEvent('chaldene:start-animation')\n"
        "                                │\n"
        "                             listener fires, then for each frame (1 s):\n"
        "                               setInputValue(cellId, '1', 'in1', sigma)\n"
        "                               setInputValue(cellId, '2', 'in1', range)\n"
        "                               run(cellId)\n"
        "```\n"
        "\n"
        "`display(Javascript(...))` is the bridge: it serialises the Python data as\n"
        "JSON and injects it as a DOM event. The JS side never polls — it just reacts.\n"
        "\n"
        "To adapt this pattern: replace the frame list with any Python computation\n"
        "(optimiser output, sensor readings, grid-search results) and adjust the\n"
        "event name and VP cell parameters."
    ),
]

nb = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3 (ipykernel)",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.12.0"
        }
    },
    "cells": cells
}

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "animated_demo.ipynb")
with open(out, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

nb2 = json.load(open(out, encoding="utf-8"))
vp_cells = sum(1 for c in nb2["cells"]
               if c.get("metadata", {}).get("code type") == "visual code")
js_cells  = sum(1 for c in nb2["cells"]
               if c["cell_type"] == "code" and
               "".join(c["source"]).startswith("%%javascript"))
print(f"Written: {out}")
print(f"  Total cells : {len(nb2['cells'])}")
print(f"  Markdown    : {sum(1 for c in nb2['cells'] if c['cell_type'] == 'markdown')}")
print(f"  VP cells    : {vp_cells}  (node-graph canvas)")
print(f"  JS cells    : {js_cells}  (listener registration)")
print(f"  Python cells: {sum(1 for c in nb2['cells'] if c['cell_type'] == 'code') - vp_cells - js_cells}")
