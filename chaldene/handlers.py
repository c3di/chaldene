"""Jupyter server extension handlers for the Chaldene Zenodo integration."""

from __future__ import annotations

import json
import os
from functools import partial

import tornado
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join

from .config import ZenodoConfig
from .zenodo import ZenodoError, publish_paths


def _resolve_within_root(root_dir: str, rel_path: str) -> str:
    """Resolve a contents-API path against the server root, blocking traversal.

    Paths from the JupyterLab contents API are POSIX, server-root-relative, and
    never start with a leading slash. We reject anything that escapes the root.
    """
    root = os.path.realpath(root_dir)
    candidate = os.path.realpath(os.path.join(root, rel_path.lstrip("/")))
    if candidate != root and not candidate.startswith(root + os.sep):
        raise ZenodoError("Path is outside the server root.", status=400)
    return candidate


class ZenodoPublishHandler(APIHandler):
    """POST a file/folder path + metadata; publish to Zenodo and return the DOI."""

    @tornado.web.authenticated
    async def post(self) -> None:
        try:
            body = self.get_json_body() or {}
        except Exception:  # noqa: BLE001 - malformed JSON
            self.set_status(400)
            self.finish(json.dumps({"message": "Request body must be valid JSON."}))
            return

        metadata = body.get("metadata") or {}
        # Accept a list of paths ('paths') or a single 'path' for compatibility.
        rel_paths = body.get("paths")
        if not rel_paths:
            single = body.get("path")
            rel_paths = [single] if single else []
        if not rel_paths:
            self.set_status(400)
            self.finish(
                json.dumps({"message": "Missing 'paths' in request body."})
            )
            return

        # A token supplied in the request takes precedence; otherwise fall back
        # to the server-side ZenodoConfig / ZENODO_TOKEN configuration.
        token = (
            (body.get("token") or "").strip()
            or ZenodoConfig(config=self.settings.get("config")).token
            or None
        )

        try:
            root_dir = self.contents_manager.root_dir
            abs_paths = [_resolve_within_root(root_dir, p) for p in rel_paths]
            loop = tornado.ioloop.IOLoop.current()
            # publish_paths uses blocking `requests`; run it off the event loop.
            result = await loop.run_in_executor(
                None, partial(publish_paths, abs_paths, metadata, token)
            )
        except ZenodoError as error:
            self.set_status(error.status)
            self.finish(json.dumps({"message": error.message}))
            return
        except Exception as error:  # noqa: BLE001 - surface unexpected failures
            self.set_status(500)
            self.finish(json.dumps({"message": f"Unexpected error: {error}"}))
            return

        self.finish(json.dumps(result))


def setup_handlers(web_app) -> None:
    """Register Chaldene server-extension routes on the Jupyter web app."""
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]
    route = url_path_join(base_url, "chaldene", "zenodo", "publish")
    web_app.add_handlers(host_pattern, [(route, ZenodoPublishHandler)])
