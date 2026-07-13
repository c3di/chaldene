# API Tutorials

Runnable notebooks demonstrating how to drive VP cells programmatically.

| Notebook | Description |
|---|---|
| `slider_demo.ipynb` | `ipywidgets` FloatSlider controlling a threshold node via `ChaldeneClient` |
| `animated_demo.ipynb` | Animated parameter sweep over a VP pipeline |
| `token_api_tutorial.ipynb` | Reference guide for TypeScript extension developers using `IChaldeneService` |

The `.ipynb` files are generated from the corresponding `build_*.py` scripts.
To regenerate after editing a script, run it from the repo root:

```bash
python api_tutorials/build_slider_demo.py
python api_tutorials/build_animated_demo.py
python api_tutorials/build_tutorial_notebook.py
```
