// Package pins for environment.yml generation — update here when a
// dependency/version changes. A given exported workflow only needs the
// subset of these its generated workflow.py actually imports (see
// PWDGenerator.condaEnv), not the whole list: pulling in every optional
// package (pyimagej, opencv, im2im, ...) even for a workflow that never
// touches an image was the bug reported in testing-chaldene#3.
interface IPackageSpec {
  /** The module's top-level Python import name, e.g. `cv2` for opencv. */
  importName: string;
  /** conda-forge package spec, for a package available there. */
  condaSpec?: string;
  /** pip-only package spec, listed under the `pip:` section instead. */
  pipSpec?: string;
}

const packages: IPackageSpec[] = [
  { importName: 'numpy', condaSpec: 'numpy==2.2.4' },
  { importName: 'PIL', condaSpec: 'pillow==11.1.0' },
  { importName: 'pandas', condaSpec: 'pandas==2.2.3' },
  { importName: 'skimage', condaSpec: 'scikit-image==0.25.2' },
  { importName: 'scipy', condaSpec: 'scipy==1.15.2' },
  { importName: 'cv2', condaSpec: 'opencv==4.11.0' },
  { importName: 'matplotlib', condaSpec: 'matplotlib==3.10.1' },
  { importName: 'imagej', condaSpec: 'pyimagej==1.7.0' },
  { importName: 'im2im', pipSpec: 'im2im' }
];

/** Build an environment.yml listing only the packages a workflow actually imports. */
export function condaEnvironmentFor(usedImportNames: Set<string>): string {
  const condaDeps = ['python>=3.8'];
  const pipDeps: string[] = [];

  packages.forEach(pkg => {
    if (!usedImportNames.has(pkg.importName)) {
      return;
    }
    if (pkg.condaSpec) {
      condaDeps.push(pkg.condaSpec);
    } else if (pkg.pipSpec) {
      pipDeps.push(pkg.pipSpec);
    }
  });

  const depLines = condaDeps.map(dep => `  - ${dep}`);
  if (pipDeps.length > 0) {
    depLines.push('  - pip:');
    pipDeps.forEach(dep => depLines.push(`    - ${dep}`));
  }

  return `name: chaldene
channels:
  - conda-forge
  - defaults
dependencies:
${depLines.join('\n')}
`;
}
