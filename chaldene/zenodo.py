"""Thin client for the Zenodo REST API (production).

Used by the Chaldene Jupyter server extension to publish a user-selected file or
folder to Zenodo and mint a DOI. The Zenodo personal access token is resolved
server-side (never sent from the browser): it is taken from the traitlets
``ZenodoConfig.token`` setting if provided, otherwise from the ``ZENODO_TOKEN``
environment variable.

API reference: https://developers.zenodo.org/
"""

from __future__ import annotations

import os
import shutil
import tempfile
from typing import Any, Dict, Optional

import requests

#: Production Zenodo API base URL. Sandbox / pluggable targets are intentionally
#: out of scope for now (see the feature plan).
ZENODO_API_BASE = "https://zenodo.org/api"

#: HTTP timeout (seconds) for metadata calls. File uploads use a longer timeout.
_REQUEST_TIMEOUT = 60
_UPLOAD_TIMEOUT = 60 * 30


class ZenodoError(Exception):
    """Raised for any Zenodo / configuration failure, carrying an HTTP status.

    ``status`` is the HTTP status code the server extension should return to the
    frontend; ``message`` is a human-readable explanation safe to surface.
    """

    def __init__(self, message: str, status: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


def _resolve_token(token: Optional[str] = None) -> str:
    """Return the Zenodo token, preferring an explicit value then the env var."""
    resolved = token or os.environ.get("ZENODO_TOKEN")
    if not resolved:
        raise ZenodoError(
            "Zenodo token is not configured. Set the ZENODO_TOKEN environment "
            "variable or `c.ZenodoConfig.token` in jupyter_server_config.py.",
            status=400,
        )
    return resolved


class ZenodoClient:
    """Minimal Zenodo deposition workflow: create, upload, set metadata, publish."""

    def __init__(self, token: Optional[str] = None, api_base: str = ZENODO_API_BASE):
        self._token = _resolve_token(token)
        self._api_base = api_base.rstrip("/")
        self._session = requests.Session()
        self._session.headers.update({"Authorization": f"Bearer {self._token}"})

    # -- low-level helpers ---------------------------------------------------

    def _raise_for_status(self, response: requests.Response, action: str) -> None:
        if response.status_code < 400:
            return
        # Surface Zenodo's own error message when present, but never the token.
        detail = ""
        try:
            payload = response.json()
            detail = payload.get("message") or ""
            errors = payload.get("errors")
            if errors:
                detail = f"{detail}: {errors}" if detail else str(errors)
        except ValueError:
            detail = response.text[:500]
        raise ZenodoError(
            f"Zenodo {action} failed ({response.status_code}): {detail}".strip(),
            status=502 if response.status_code >= 500 else 400,
        )

    # -- deposition workflow -------------------------------------------------

    def create_deposition(self) -> Dict[str, Any]:
        """Create an empty deposition. Returns the deposition JSON."""
        response = self._session.post(
            f"{self._api_base}/deposit/depositions",
            json={},
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_status(response, "create deposition")
        return response.json()

    def upload_file(self, bucket_url: str, filename: str, filepath: str) -> None:
        """Upload a single file via the bucket (new files) API."""
        with open(filepath, "rb") as handle:
            response = self._session.put(
                f"{bucket_url}/{filename}",
                data=handle,
                timeout=_UPLOAD_TIMEOUT,
            )
        self._raise_for_status(response, "file upload")

    def set_metadata(self, deposition_id: int, metadata: Dict[str, Any]) -> None:
        """Attach metadata to a deposition."""
        response = self._session.put(
            f"{self._api_base}/deposit/depositions/{deposition_id}",
            json={"metadata": metadata},
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_status(response, "set metadata")

    def publish(self, deposition_id: int) -> Dict[str, Any]:
        """Publish a deposition. Returns the published record JSON."""
        response = self._session.post(
            f"{self._api_base}/deposit/depositions/{deposition_id}/actions/publish",
            timeout=_REQUEST_TIMEOUT,
        )
        self._raise_for_status(response, "publish")
        return response.json()


def _normalize_metadata(metadata: Optional[Dict[str, Any]], fallback_title: str) -> Dict[str, Any]:
    """Fill in Zenodo's required metadata fields with sensible defaults."""
    metadata = dict(metadata or {})
    metadata.setdefault("title", fallback_title)
    metadata.setdefault("upload_type", "dataset")
    metadata.setdefault("description", metadata.get("title", fallback_title))
    creators = metadata.get("creators")
    if not creators:
        metadata["creators"] = [{"name": "Unknown"}]
    return metadata


def _prepare_upload(server_path: str, tmp_dir: str) -> "tuple[str, str]":
    """Return ``(upload_path, upload_name)`` for a file or (zipped) directory."""
    if os.path.isdir(server_path):
        base_name = os.path.basename(os.path.normpath(server_path)) or "archive"
        archive_path = shutil.make_archive(
            os.path.join(tmp_dir, base_name), "zip", server_path
        )
        return archive_path, os.path.basename(archive_path)
    return server_path, os.path.basename(server_path)


def publish_paths(
    server_paths: "list[str]",
    metadata: Optional[Dict[str, Any]] = None,
    token: Optional[str] = None,
) -> Dict[str, Any]:
    """Publish one or more absolute file/directory paths as a single Zenodo record.

    Each directory is zipped into a temporary archive before upload; every item
    becomes a file in the same deposition, sharing one DOI. Returns
    ``{"doi", "recordUrl", "conceptDoi", "files"}``.
    """
    if not server_paths:
        raise ZenodoError("No files selected to publish.", status=400)
    for server_path in server_paths:
        if not os.path.exists(server_path):
            raise ZenodoError(f"Path does not exist: {server_path}", status=404)

    client = ZenodoClient(token=token)

    tmp_dir: Optional[str] = None
    try:
        tmp_dir = tempfile.mkdtemp(prefix="chaldene-zenodo-")
        uploads = [_prepare_upload(p, tmp_dir) for p in server_paths]

        # Guard against name collisions (e.g. same-named files from two folders).
        seen: Dict[str, int] = {}
        deduped: "list[tuple[str, str]]" = []
        for upload_path, upload_name in uploads:
            if upload_name in seen:
                seen[upload_name] += 1
                root, ext = os.path.splitext(upload_name)
                upload_name = f"{root}_{seen[upload_name]}{ext}"
            else:
                seen[upload_name] = 0
            deduped.append((upload_path, upload_name))

        deposition = client.create_deposition()
        bucket_url = deposition.get("links", {}).get("bucket")
        deposition_id = deposition.get("id")
        if not bucket_url or deposition_id is None:
            raise ZenodoError("Zenodo did not return a usable deposition.", status=502)

        for upload_path, upload_name in deduped:
            client.upload_file(bucket_url, upload_name, upload_path)

        fallback_title = (
            deduped[0][1]
            if len(deduped) == 1
            else f"{deduped[0][1]} (+{len(deduped) - 1} more)"
        )
        client.set_metadata(deposition_id, _normalize_metadata(metadata, fallback_title))
        record = client.publish(deposition_id)
    finally:
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    links = record.get("links", {})
    return {
        "doi": record.get("doi") or record.get("metadata", {}).get("doi"),
        "conceptDoi": record.get("conceptdoi"),
        "recordUrl": links.get("record_html") or links.get("html"),
        "files": [name for _, name in deduped],
    }
