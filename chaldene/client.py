from __future__ import annotations

from comm import create_comm


class ChaldeneClient:
    """Python-side proxy for the Chaldene JupyterLab service.

    Opens a comm channel to the extension so the full IChaldeneService API
    is available as ordinary Python method calls — no ``display(Javascript)``
    required.

    Usage::

        client = ChaldeneClient()

        @widgets.interact(lower=widgets.FloatSlider(value=0.2, min=0.0, max=0.85, step=0.05))
        def on_change(lower):
            ids = client.get_ready_cell_ids()
            if not ids:
                return
            client.set_input(ids[-1], '1', 'in1', [lower, 0.9])
            client.run(ids[-1])
    """

    def __init__(self) -> None:
        self._ready_cells: list[str] = []
        self._comm = create_comm(target_name='chaldene:api')
        self._comm.on_msg(self._handle_msg)
        self._comm.open()

    # ── Internal ────────────────────────────────────────────────────────────────

    def _handle_msg(self, msg: dict) -> None:
        data = msg['content']['data']
        t = data.get('type')
        if t == 'init':
            self._ready_cells = list(data.get('cellIds', []))
        elif t == 'cell_ready':
            cell_id = data['cellId']
            if cell_id not in self._ready_cells:
                self._ready_cells.append(cell_id)
        elif t == 'cell_disposed':
            try:
                self._ready_cells.remove(data['cellId'])
            except ValueError:
                pass

    # ── Discovery ───────────────────────────────────────────────────────────────

    def get_ready_cell_ids(self) -> list[str]:
        """Return the IDs of all VP cells currently rendered in the notebook."""
        return list(self._ready_cells)

    # ── Write ───────────────────────────────────────────────────────────────────

    def set_input(
        self,
        cell_id: str,
        node_id: str,
        handle_id: str,
        value: object,
    ) -> None:
        """Set an input handle value on a node inside a VP cell."""
        self._comm.send({
            'action': 'setInputValue',
            'cellId': cell_id,
            'nodeId': node_id,
            'handleId': handle_id,
            'value': value,
        })

    def set_graph(self, cell_id: str, graph: dict) -> None:
        """Replace the entire graph of a VP cell."""
        self._comm.send({'action': 'setGraph', 'cellId': cell_id, 'graph': graph})

    # ── Execution ───────────────────────────────────────────────────────────────

    def run(self, cell_id: str) -> None:
        """Trigger execution of a VP cell."""
        self._comm.send({'action': 'run', 'cellId': cell_id})

    # ── Lifecycle ───────────────────────────────────────────────────────────────

    def close(self) -> None:
        """Close the comm channel."""
        self._comm.close()
