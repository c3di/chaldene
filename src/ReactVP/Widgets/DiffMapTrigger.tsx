import ColorBar from './ColorBar';

export default function DiffMapTrigger({
  toggled,
  toggle
}: {
  toggled: boolean;
  toggle: () => void;
}): JSX.Element {
  return (
    <div>
      <ColorBar colormap="binary" />
      <button
        className={`heatmap-button nodrag ${toggled ? 'active' : ''}`}
        onClick={toggle}
        title={toggled ? 'Hide Difference' : 'Show Difference'}
      >
        {toggled ? 'Hide diff' : 'Show diff'}
      </button>
    </div>
  );
}
