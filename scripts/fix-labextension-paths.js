// On Windows, @jupyterlab/builder writes _build.load with backslashes (path.join).
// JupyterLab constructs a URL from this value, so it must use forward slashes.
const fs = require('fs');
const pkgPath = 'chaldene/labextension/package.json';
const data = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const build = data?.jupyterlab?._build;
if (build?.load) {
  build.load = build.load.replace(/\\/g, '/');
  fs.writeFileSync(pkgPath, JSON.stringify(data, null, 2));
  console.log('[chaldene] Fixed _build.load path:', build.load);
}
