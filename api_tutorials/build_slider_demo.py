"""
Build slider_demo.ipynb — ipywidgets slider driving a Chaldene VP cell.
Run with: python api_tutorials/build_slider_demo.py  (from repo root)
"""
import json
import os
import uuid


def mid():
    return str(uuid.uuid4())


def md(source):
    return {"cell_type": "markdown", "id": mid(), "metadata": {},
            "source": [source] if isinstance(source, str) else source}


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


# ── VP graph: read_image → threshold ─────────────────────────────────────────

GRAPH = {
    "nodes": [
        {
            "id": "0", "type": "read_image",
            "position": {"x": 100, "y": 150}, "selected": False,
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
            "position": {"x": 550, "y": 150}, "selected": False,
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
        {"id": "e0", "source": "0", "sourceHandle": "out0",
         "target": "1", "targetHandle": "in0", "selected": False}
    ]
}

# ── cell sources ──────────────────────────────────────────────────────────────

SETUP = '''\
from PIL import Image
import numpy as np

arr = np.random.default_rng(42).integers(0, 256, (256, 256), dtype=np.uint8)
Image.fromarray(arr, mode='L').save('sample.png')
print('sample.png ready (256x256 grayscale)')
'''

CLIENT_SETUP = '''\
from chaldene import ChaldeneClient

client = ChaldeneClient()
print('Chaldene client ready.')
'''

SLIDER = '''\
import ipywidgets as widgets

@widgets.interact(
    lower=widgets.FloatSlider(
        min=0.0, max=0.85, step=0.05, value=0.2,
        description='lower:',
        continuous_update=False,
    )
)
def on_threshold_change(lower):
    ids = client.get_ready_cell_ids()
    if not ids:
        return
    client.set_input(ids[-1], '1', 'in1', [lower, 0.9])
    client.run(ids[-1])
'''

# ── assemble notebook ─────────────────────────────────────────────────────────

cells = [
    md(
        "# Chaldene Slider Demo\n"
        "\n"
        "A Python `interact` slider controls the lower threshold bound of a VP cell.\n"
        "`ChaldeneClient` communicates with the extension over a Jupyter comm channel,\n"
        "so `set_input` and `run` are ordinary Python calls — no `display(Javascript)` needed.\n"
        "\n"
        "> Run cells in order with Shift+Enter."
    ),

    code(SETUP),

    md(
        "---\n"
        "## Step 1 — The VP pipeline\n"
        "\n"
        "Run this cell to open the visual canvas."
    ),

    vp(GRAPH),

    md(
        "---\n"
        "## Step 2 — Connect the client\n"
        "\n"
        "`ChaldeneClient()` opens a comm channel to the extension and starts tracking\n"
        "which VP cells are ready. Run this cell after the VP canvas above is visible."
    ),

    code(CLIENT_SETUP),

    md(
        "---\n"
        "## Step 3 — Slider\n"
        "\n"
        "Drag the **lower bound** knob. On release the VP cell re-executes with the\n"
        "new threshold range via `client.set_input` + `client.run`."
    ),

    code(SLIDER),
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

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "slider_demo.ipynb")
with open(out, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

nb2 = json.load(open(out, encoding="utf-8"))
vp_cells = sum(1 for c in nb2["cells"]
               if c.get("metadata", {}).get("code type") == "visual code")
py_cells  = sum(1 for c in nb2["cells"]
               if c["cell_type"] == "code" and
               not c.get("metadata", {}).get("code type"))
print(f"Written: {out}")
print(f"  Total cells : {len(nb2['cells'])}")
print(f"  VP cells    : {vp_cells}")
print(f"  Python cells: {py_cells}")
