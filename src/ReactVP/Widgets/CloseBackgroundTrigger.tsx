export default function CloseBackgroundTrigger({
  toggled,
  toggle
}: {
  toggled: boolean;
  toggle: () => void;
}): JSX.Element {
  return (
    <div className="diff-map-container">
      <label className="diff-map-label">
        <span>Background</span>
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
    </div>
  );
}
