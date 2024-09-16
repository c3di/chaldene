export interface IMenuItemConfig {
  icon?: JSX.Element;
  displayLabel?: string;
  description?: string;
  shortcut?: string;
  disabled?: boolean | ((target: any) => boolean);
  onClick?: (event: any, forWhom: any) => void;
  widget?: JSX.Element;
}

export interface IMenuItemProps extends IMenuItemConfig {
  forWhom: any;
  onClick?: (event: any) => void;
}

export default function MenuItem({
  forWhom,
  icon,
  displayLabel,
  shortcut,
  widget,
  description,
  onClick,
  disabled
}: IMenuItemProps): JSX.Element {
  const isDisabled =
    typeof disabled === 'function' ? disabled(forWhom) : disabled;
  const title = description ?? displayLabel ?? '';

  return (
    <li
      className={`menu-item ${isDisabled ? 'disabled' : ''} ${
        widget ? 'has-widget' : ''
      }`}
      onClick={!isDisabled ? onClick : undefined}
      title={title}
      role="menuitem"
    >
      {(icon ?? displayLabel ?? shortcut) && (
        <div className="menu-item-main-content">
          {icon && <div className="menu-item-icon">{icon}</div>}
          {displayLabel && (
            <div className="menu-item-label">{displayLabel}</div>
          )}
          {shortcut && <div className="menu-item-shortcut">{shortcut}</div>}
        </div>
      )}
      {widget && <div className="menu-item-widget">{widget}</div>}
    </li>
  );
}
