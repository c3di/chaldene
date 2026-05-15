// Content of environment.yml — update both files together when dependencies change.
const condaEnvironment = `name: chaldene
channels:
  - conda-forge
  - defaults
dependencies:
  - python>=3.8
  - numpy==2.2.4
  - pillow==11.1.0
  - pandas==2.2.3
  - scikit-image==0.25.2
  - scipy==1.15.2
  - opencv==4.11.0
  - matplotlib==3.10.1
  - pyimagej==1.7.0
  - pip:
    - im2im
`;

export default condaEnvironment;
