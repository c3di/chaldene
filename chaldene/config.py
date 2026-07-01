"""Server-side configuration for the Chaldene Zenodo integration."""

from __future__ import annotations

from traitlets import Unicode
from traitlets.config import Configurable


class ZenodoConfig(Configurable):
    """Configurable Zenodo settings.

    Configure in ``jupyter_server_config.py`` with::

        c.ZenodoConfig.token = "<your zenodo personal access token>"

    If left empty, the token falls back to the ``ZENODO_TOKEN`` environment
    variable (resolved in :mod:`chaldene.zenodo`).
    """

    token = Unicode(
        "",
        config=True,
        help="Zenodo personal access token (production zenodo.org). "
        "Falls back to the ZENODO_TOKEN environment variable when empty.",
    )
