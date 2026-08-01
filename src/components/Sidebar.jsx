import PropTypes from 'prop-types';

const SECTIONS = [
  { id: 'section-activity', label: 'Activity' },
  { id: 'section-wellness', label: "Today's Wellness" },
  { id: 'section-trends', label: 'Trends' },
];

function Sidebar({ activeSection, onNavigate, theme, onToggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>Fitness Dashboard</h1>
        <span className="brand-sub">Personal build</span>
      </div>

      <span className="nav-group-label">Sections</span>
      <ul className="nav-list">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className={`nav-link${activeSection === section.id ? ' active' : ''}`}
              onClick={() => onNavigate(section.id)}
            >
              {section.label}
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
  activeSection: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  theme: PropTypes.oneOf(['light', 'dark']).isRequired,
  onToggleTheme: PropTypes.func.isRequired,
};

export default Sidebar;
export { SECTIONS };
