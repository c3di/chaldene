/*
 * parts of svg icons from https://github.com/jupyterlab/jupyterlab/tree/main/packages/ui-components/style/icons
 */

export { FaUnlink as UnlinkIcon } from 'react-icons/fa';

export const CopyIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 18 18">
    <path
      fill="#616161"
      d="M11.9 1H3.2c-.8 0-1.5.7-1.5 1.5v10.2h1.5V2.5h8.7zm2.2 2.9h-8c-.8 0-1.5.7-1.5 1.5v10.2c0 .8.7 1.5 1.5 1.5h8c.8 0 1.5-.7 1.5-1.5V5.4c-.1-.8-.7-1.5-1.5-1.5m0 11.6h-8V5.4h8z"
      className="jp-icon3"
    />
  </svg>
);

export const CloseIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      fill="#616161"
      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      className="jp-icon3"
    />
  </svg>
);

export const CutIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      fill="#616161"
      d="M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z"
      className="jp-icon3"
    />
  </svg>
);

export const DeleteIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      fill="#616161"
      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      className="jp-icon3"
    />
  </svg>
);

export const DuplicateIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M11,17H4A2,2 0 0,1 2,15V3A2,2 0 0,1 4,1H16V3H4V15H11V13L15,16L11,19V17M19,21V7H8V13H6V7A2,2 0 0,1 8,5H19A2,2 0 0,1 21,7V21A2,2 0 0,1 19,23H8A2,2 0 0,1 6,21V19H8V21H19Z"
    />
  </svg>
);

export const FileUploadIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"
    />
  </svg>
);

export const PasteIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <g className="jp-icon3" fill="#616161">
      <path d="M19,20H5V4H7V7H17V4H19M12,2A1,1 0 0,1 13,3A1,1 0 0,1 12,4A1,1 0 0,1 11,3A1,1 0 0,1 12,2M19,2H14.82C14.4,0.84 13.3,0 12,0C10.7,0 9.6,0.84 9.18,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4A2,2 0 0,0 19,2Z" />
    </g>
  </svg>
);

export const RefreshIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
    />
  </svg>
);

export const SearchIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M9.5 3A6.5 6.5 0 0116 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5-1.5 1.5-5-5v-.79l-.27-.27A6.516 6.516 0 019.5 16 6.5 6.5 0 013 9.5 6.5 6.5 0 019.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14 14 12 14 9.5 12 5 9.5 5z"
    />
  </svg>
);

export const AddIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
    />
  </svg>
);

export const CodeIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"
    />
  </svg>
);

export const AutoLayoutIcon = (): JSX.Element => (
  <svg
    clipRule="evenodd"
    fillRule="evenodd"
    strokeLinejoin="round"
    strokeMiterlimit="2"
    viewBox="0 0 24 24"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="m11.6 11c0-.552-.448-1-1-1-1.655 0-4.945 0-6.6 0-.552 0-1 .448-1 1v9c0 .552.448 1 1 1h6.6c.552 0 1-.448 1-1 0-2.092 0-6.908 0-9zm9.4 6c0-.552-.448-1-1-1h-6c-.538 0-1 .477-1 1v3c0 .552.448 1 1 1h6c.552 0 1-.448 1-1zm-1.5.5v2h-5v-2zm-9.4-6v8h-5.6v-8zm10.9-7.5c0-.552-.448-1-1-1-1.537 0-4.463 0-6 0-.552 0-1 .448-1 1v9.6c0 .552.448 1 1 1h6c.552 0 1-.448 1-1 0-2.194 0-7.406 0-9.6zm-1.5.5v8.6h-5v-8.6zm-7.9-.5c0-.552-.448-1-1-1-1.655 0-4.945 0-6.6 0-.552 0-1 .448-1 1v3.6c0 .552.448 1 1 1h6.6c.552 0 1-.448 1-1 0-1.017 0-2.583 0-3.6zm-1.5.5v2.6h-5.6v-2.6z"
      fillRule="nonzero"
    />
  </svg>
);

export const SelectAllIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z"
    />
  </svg>
);

export const FitViewIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="16">
    <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
  </svg>
);

export const CheckReadinessIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      className="jp-icon3"
      fill="#616161"
      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
    />
  </svg>
);

export const ChevronUpIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
  >
    <path fill="#616161" d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
  </svg>
);

export const ChevronDownIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
  >
    <path fill="#616161" d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
  </svg>
);
