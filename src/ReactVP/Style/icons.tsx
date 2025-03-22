/* eslint-disable @typescript-eslint/naming-convention */
/*
 * parts of svg icons from https://github.com/jupyterlab/jupyterlab/tree/main/packages/ui-components/style/icons
 */

export const UnlinkIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 640 512">
    <path
      fill="#616161"
      d="M579.4 267.2c56.2-56.2 56.2-147.3 0-203.5-56.2-56.2-147.3-56.2-203.5 0L300.9 139.7l45.2 45.3 74.9-75c32.8-32.9 86-32.9 118.8 0 32.9 32.8 32.9 86 0 118.8L405 363.7l45.3 45.2 129.1-141.7zm-393.1 0l-74.9 75c-32.8 32.9-86 32.9-118.8 0-32.9-32.8-32.9-86 0-118.8l134.8-134.8-45.3-45.3L0 160c-56.2 56.2-56.2 147.3 0 203.5 56.2 56.2 147.3 56.2 203.5 0l107.1-107.1-45.3-45.3-79 56.1zM225.8 32.2L181.8 8.1c-4.9-2.9-11-3-16 0-5 2.9-8 8.1-8 13.8v75.1c0 5.7 3 11 8 13.9 4.9 2.9 11 2.9 16-.1l44-24.1c5-2.9 8.1-8.2 8.1-13.9 0-5.7-3.1-11-8.1-13.8v-13.8zm176.9 415.9l44 24.1c4.9 2.9 11 3 16 0 5-2.9 8-8.1 8-13.8v-75.1c0-5.7-3-11-8-13.9-4.9-2.9-11-2.9-16 .1l-44 24.1c-5 2.9-8.1 8.2-8.1 13.9 0 5.7 3.1 11 8.1 13.8v-13.8z"
    />
  </svg>
);

export const FolderIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      fill="#616161"
      d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8z"
      className="jp-icon3 jp-icon-selectable"
    />
  </svg>
);

export const FileIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 22 22">
    <path
      fill="#616161"
      d="m19.3 8.2-5.5-5.5c-.3-.3-.7-.5-1.2-.5H3.9c-.8.1-1.6.9-1.6 1.8v14.1c0 .9.7 1.6 1.6 1.6h14.2c.9 0 1.6-.7 1.6-1.6V9.4c.1-.5-.1-.9-.4-1.2m-5.8-3.3 3.4 3.6h-3.4zm3.9 12.7H4.7c-.1 0-.2 0-.2-.2V4.7c0-.2.1-.3.2-.3h7.2v4.4s0 .8.3 1.1 1.1.3 1.1.3h4.3v7.2s-.1.2-.2.2"
      className="jp-icon3 jp-icon-selectable"
    />
  </svg>
);

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
    width="24"
    height="24"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
  >
    <rect
      x="3"
      y="15"
      width="6"
      height="4"
      fill="white"
      stroke="black"
      stroke-width="1.5"
    />
    <rect
      x="15"
      y="5"
      width="6"
      height="4"
      fill="white"
      stroke="black"
      stroke-width="1.5"
    />
    <path
      d="M9,17 C11,17 11,7 15,7"
      stroke="black"
      stroke-width="1.5"
      fill="transparent"
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

export const RejectIcon = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" viewBox="0 0 24 24">
    <path
      fill="#F44336"
      d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
    />
  </svg>
);

export const LeftArrowIcon = (): JSX.Element => (
  <svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor">
    <path d="m390.627 54.627-201.372 201.373 201.372 201.373a32 32 0 1 1 -45.254 45.254l-224-224a32 32 0 0 1 0-45.254l224-224a32 32 0 0 1 45.254 45.254z" />
  </svg>
);

export const RightArrowIcon = (): JSX.Element => (
  <svg viewBox="0 0 512 512" width="16" height="16" fill="currentColor">
    <path d="m121.373 457.373 201.372-201.373-201.372-201.373a32 32 0 0 1 45.254-45.254l224 224a32 32 0 0 1 0 45.254l-224 224a32 32 0 0 1 -45.254-45.254z" />
  </svg>
);

interface SelectionIconProps {
  showCheck?: boolean;
}

export const SelectionIcon = ({
  showCheck = true
}: SelectionIconProps): JSX.Element => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <g clipRule="evenodd" fillRule="evenodd">
      <path d="m1.75 4c0-1.24264 1.00736-2.25 2.25-2.25h13c1.2427 0 2.25 1.00737 2.25 2.25v13c0 1.2427-1.0073 2.25-2.25 2.25h-13c-1.24263 0-2.25-1.0073-2.25-2.25zm2.25-.75c-.41421 0-.75.33579-.75.75v13c0 .4142.33578.75.75.75h13c.4142 0 .75-.3358.75-.75v-13c0-.41422-.3358-.75-.75-.75z" />
      <path d="m21.9997 5.75098c.4142 0 .75.33578.75.75v14.49902c0 .9665-.7835 1.75-1.75 1.75h-14.49824c-.41421 0-.75-.3358-.75-.75s.33579-.75.75-.75h14.49824c.138 0 .25-.1119.25-.25v-14.49902c0-.41422.3358-.75.75-.75z" />
      {showCheck && (
        <path d="m15.0227 7.32173c.297.28866.3039.76348.0152 1.06055l-5.0002 5.14582c-.28316.2915-.74697.3044-1.04591.0291l-2.99985-2.7626c-.30469-.2806-.32423-.755-.04364-1.05974.2806-.3047.75507-.32424 1.05976-.04364l2.46274 2.26788 4.4913-4.62214c.2887-.29707.7635-.30389 1.0606-.01523z" />
      )}
    </g>
  </svg>
);
