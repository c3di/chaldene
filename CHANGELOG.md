# Changelog

<!-- <START NEW CHANGELOG ENTRY> -->

## 0.2.0

### Added

- **`ChaldeneClient` Python API**: control VP cells from Python without
  `display(Javascript)`. `ChaldeneClient` opens a Jupyter comm channel to
  the extension, exposing `get_ready_cell_ids()`, `set_input()`,
  `set_graph()`, and `run()` as plain Python calls. Works with
  `ipywidgets.interact` for live parameter control.
- **`IChaldeneService` TypeScript token**: JupyterLab extensions can request
  `IChaldeneService` from the Lumino DI system to read and modify VP cell
  graphs and trigger execution programmatically.
- **Test suite**: Jest unit and integration tests for `ChaldeneService`,
  `EditorContext`, and the comm protocol.
- **`api_tutorials/`**: runnable demo notebooks for the Python API
  (`slider_demo.ipynb`, `animated_demo.ipynb`) and for TypeScript extension
  developers (`token_api_tutorial.ipynb`).

### Fixed

- VP cells now execute by cell ID rather than via `NotebookActions.run`,
  preventing the wrong cell from running when a Python callback triggers
  execution.
- `ipywidgets` FloatSlider layout no longer collapses when displayed
  alongside a VP cell (scoped `.slider-container` CSS to avoid conflict
  with noUiSlider).
- Windows builds: `_build.load` path in `labextension/package.json` is
  normalised to use forward slashes after `@jupyterlab/builder` produces
  backslashes via `path.join`.

<!-- <END NEW CHANGELOG ENTRY> -->
