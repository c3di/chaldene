export default function DiffMapTrigger({
  toggled,
  toggle
}: {
  toggled: boolean;
  toggle: () => void;
}): JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const toggleElement =
      e.target.parentElement?.querySelector('.switch-toggle');
    if (toggleElement) {
      toggleElement.classList.toggle('switch-toggle-checked', e.target.checked);
    }
    toggle();
  };

  return (
    <div className="diff-map-container">
      <label className="diff-map-label">
        <span>Diff</span>
        <div className="switch-container">
          <input
            type="checkbox"
            checked={toggled}
            onChange={handleChange}
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
