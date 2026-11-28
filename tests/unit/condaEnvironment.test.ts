import { condaEnvironmentFor } from '../../src/condaEnvironment';

describe('condaEnvironmentFor', () => {
  it('always includes python, even with no third-party imports', () => {
    const yaml = condaEnvironmentFor(new Set());
    expect(yaml.trim()).toBe(
      `name: chaldene
channels:
  - conda-forge
  - defaults
dependencies:
  - python>=3.8`
    );
  });

  it('includes only the conda packages actually imported', () => {
    const yaml = condaEnvironmentFor(new Set(['numpy', 'skimage']));
    expect(yaml).toContain('- numpy==2.2.4');
    expect(yaml).toContain('- scikit-image==0.25.2');
    expect(yaml).not.toContain('pandas');
    expect(yaml).not.toContain('scipy');
    expect(yaml).not.toContain('opencv');
    expect(yaml).not.toContain('pip:');
  });

  it('puts pip-only packages under a pip: section', () => {
    const yaml = condaEnvironmentFor(new Set(['im2im']));
    expect(yaml.trim()).toBe(
      `name: chaldene
channels:
  - conda-forge
  - defaults
dependencies:
  - python>=3.8
  - pip:
    - im2im`
    );
  });

  it('ignores unknown/unmanaged module names', () => {
    const yaml = condaEnvironmentFor(new Set(['os', 'json', 'not_a_real_pkg']));
    expect(yaml.trim()).toBe(
      `name: chaldene
channels:
  - conda-forge
  - defaults
dependencies:
  - python>=3.8`
    );
  });
});
