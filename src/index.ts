import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the chaldene extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'chaldene:plugin',
  description: 'Visual Programming in JupyterLab for Image Processing',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension chaldene is activated!');
  }
};

export default plugin;
