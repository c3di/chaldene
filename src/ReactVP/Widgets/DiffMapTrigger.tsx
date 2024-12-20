import ColorBar from './ColorBar';

export default function DiffMapTrigger({
  toggled,
  toggle,
  isBinary
}: {
  toggled: boolean;
  toggle: () => void;
  isBinary: boolean;
}): JSX.Element {
  return (
    <div className="diff-map-container">
      <label className="diff-map-label">
        <span>Diff</span>
        <div className="switch-container">
          <input
            type="checkbox"
            checked={toggled}
            onChange={toggle}
            className="switch-checkbox"
          />
          <div
            className={`switch-toggle ${toggled ? 'switch-toggle-checked' : ''}`}
          >
            <div className="switch-toggle-thumb" />
          </div>
        </div>
      </label>
      {toggled && (
        <div className="color-bar-container">
          <ColorBar colormap={isBinary ? 'binary' : 'turbo'} />
        </div>
      )}
    </div>
  );
}
