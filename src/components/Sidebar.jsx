import PropTypes from 'prop-types';

// One source of truth for the app's views, shared with App.jsx so the nav
// list and the rendered view can't drift apart. `hasDateFilter` decides
// whether the topbar shows the From/To controls: the filter only ever fed
// the activity summary and charts, so showing it on a view it can't affect
// would imply a relationship that doesn't exist.
const VIEWS = [
  { id: 'view-activity', label: 'Activity', hasDateFilter: true },
  { id: 'view-wellness', label: "Today's Wellness", hasDateFilter: false },
  { id: 'view-trends', label: 'Trends', hasDateFilter: false },
  { id: 'view-golf', label: 'Golf', hasDateFilter: false },
];

function Sidebar({ activeView, onNavigate, theme, onToggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>Fitness Dashboard</h1>
        <span className="brand-sub">Personal build</span>
      </div>

      <span className="nav-group-label">Sections</span>
      <ul className="nav-list">
        {VIEWS.map((view) => (
          <li key={view.id}>
            <button
              type="button"
              className={`nav-link${activeView === view.id ? ' active' : ''}`}
              aria-current={activeView === view.id ? 'page' : undefined}
              onClick={() => onNavigate(view.id)}
            >
              {view.label}
            </button>
          </li>
        ))}
        <li>
          <button type="button" className="nav-link" disabled title="Not built yet — placeholder for a later milestone">
            Reports
            <span className="nav-soon">Soon</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-spacer" />

      <div className="sidebar-foot">
        <div className="theme-row">
          <span>Dark mode</span>
          <button
            type="button"
            className={`switch${theme === 'dark' ? ' on' : ''}`}
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label="Dark mode"
            onClick={onToggleTheme}
          />
        </div>
        <p className="sidebar-note">SDET portfolio build · fixture data</p>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  activeView: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  onToggleTheme: PropTypes.func.isRequired,
};

export default Sidebar;
export { VIEWS };
