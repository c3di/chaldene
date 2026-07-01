import {
  Dialog,
  showDialog,
  showErrorMessage,
  InputDialog
} from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { Widget } from '@lumino/widgets';
import { publishToZenodo } from './ZenodoClient';

// Remember the entered token for the lifetime of the browser session so the user
// only has to type it once. Cleared automatically on an authentication failure.
let cachedToken = '';

/**
 * Interactive "Publish to Zenodo" flow for one or more server-root-relative
 * paths (files and/or folders): prompt for a Zenodo access token and the minimal
 * metadata, publish them as a single record via the Chaldene server extension,
 * and show the minted DOI (or an error).
 */
export async function runZenodoPublishFlow(paths: string[]): Promise<void> {
  if (paths.length === 0) {
    return;
  }
  const firstName = PathExt.basename(paths[0]) || 'Chaldene artifact';
  const defaultTitle =
    paths.length === 1 ? firstName : `${firstName} (+${paths.length - 1} more)`;

  // Prompt for the access token once per session (leave blank to use a token
  // already configured on the server via ZENODO_TOKEN / ZenodoConfig).
  if (!cachedToken) {
    const tokenResult = await InputDialog.getPassword({
      title: 'Publish to Zenodo — Access token',
      label:
        'Zenodo personal access token (leave blank to use the server-configured token)'
    });
    if (!tokenResult.button.accept) {
      return;
    }
    cachedToken = (tokenResult.value || '').trim();
  }

  const titleResult = await InputDialog.getText({
    title: 'Publish to Zenodo — Title',
    text: defaultTitle,
    placeholder: 'Deposit title'
  });
  if (!titleResult.button.accept) {
    return;
  }
  const title = (titleResult.value || defaultTitle).trim();

  const creatorsResult = await InputDialog.getText({
    title: 'Publish to Zenodo — Author(s)',
    text: '',
    placeholder: 'e.g. Doe, Jane; Smith, John'
  });
  if (!creatorsResult.button.accept) {
    return;
  }
  const creators = (creatorsResult.value || '')
    .split(';')
    .map(name => name.trim())
    .filter(name => name.length > 0)
    .map(name => ({ name }));

  const descResult = await InputDialog.getText({
    title: 'Publish to Zenodo — Description',
    text: title,
    placeholder: 'Short description'
  });
  if (!descResult.button.accept) {
    return;
  }

  try {
    const result = await publishToZenodo(
      paths,
      {
        title,
        upload_type: 'dataset',
        description: (descResult.value || title).trim(),
        creators: creators.length > 0 ? creators : [{ name: 'Unknown' }]
      },
      cachedToken || undefined
    );

    const doi = result.doi ?? 'unknown';
    const doiUrl = result.doi ? `https://doi.org/${result.doi}` : undefined;
    const body = document.createElement('div');
    if (result.files && result.files.length > 0) {
      const filesLine = document.createElement('p');
      filesLine.textContent = `Published ${result.files.length} file(s): ${result.files.join(', ')}`;
      body.appendChild(filesLine);
    }
    const line = document.createElement('p');
    line.textContent = `DOI: ${doi}`;
    body.appendChild(line);
    if (doiUrl) {
      const link = document.createElement('a');
      link.href = doiUrl;
      link.textContent = doiUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      body.appendChild(link);
    }
    void showDialog({
      title: 'Published to Zenodo',
      body: new Widget({ node: body }),
      buttons: [Dialog.okButton()]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Drop a bad/expired token so the next attempt re-prompts for it.
    if (/401|403|token/i.test(message)) {
      cachedToken = '';
    }
    void showErrorMessage('Zenodo publish failed', message);
  }
}
