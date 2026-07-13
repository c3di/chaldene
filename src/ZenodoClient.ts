import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';

export interface IZenodoMetadata {
  title: string;
  upload_type: string;
  description: string;
  creators: { name: string }[];
}

export interface IZenodoResult {
  doi: string | null;
  conceptDoi?: string | null;
  recordUrl?: string | null;
  files?: string[];
}

/**
 * POST one or more server-root-relative paths + metadata to the Chaldene server
 * extension, which publishes the files/folders to Zenodo as a single record and
 * returns the minted DOI.
 */
export async function publishToZenodo(
  paths: string[],
  metadata: IZenodoMetadata,
  token?: string
): Promise<IZenodoResult> {
  const settings = ServerConnection.makeSettings();
  const url = URLExt.join(settings.baseUrl, 'chaldene', 'zenodo', 'publish');

  // Only include a token when the user supplied one; otherwise the server
  // extension falls back to its ZENODO_TOKEN / ZenodoConfig configuration.
  const payload: Record<string, unknown> = { paths, metadata };
  if (token) {
    payload.token = token;
  }

  const response = await ServerConnection.makeRequest(
    url,
    { method: 'POST', body: JSON.stringify(payload) },
    settings
  );

  let data: any = undefined;
  try {
    data = await response.json();
  } catch {
    // non-JSON body (e.g. proxy error page) — fall through to status handling
  }

  if (!response.ok) {
    const message =
      (data && data.message) || `Zenodo publish failed (${response.status})`;
    throw new Error(message);
  }

  return data as IZenodoResult;
}
