import PropTypes from 'prop-types';

function DateRangeFilter({
  start,
  end,
  onStartChange,
  onEndChange,
  isLifetime,
  isThisWeek,
  onSelectLifetime,
  onSelectThisWeek,
}) {
  return (
    <div className="date-range-filter">
      <div className="date-presets" role="group" aria-label="Date range presets">
        <button
          type="button"
          className="date-preset"
          aria-pressed={isLifetime}
          onClick={onSelectLifetime}
        >
          Lifetime
        </button>
        <button
          type="button"
          className="date-preset"
          aria-pressed={isThisWeek}
          onClick={onSelectThisWeek}
        >
          This week
        </button>
      </div>
      <label>
        From
        <input type="date" value={start} onChange={(e) => onStartChange(e.target.value)} />
      </label>
      <label>
        To
        <input type="date" value={end} onChange={(e) => onEndChange(e.target.value)} />
      </label>
    </div>
  );
}

DateRangeFilter.propTypes = {
  start: PropTypes.string.isRequired,
  end: PropTypes.string.isRequired,
  onStartChange: PropTypes.func.isRequired,
  onEndChange: PropTypes.func.isRequired,
  isLifetime: PropTypes.bool.isRequired,
  isThisWeek: PropTypes.bool.isRequired,
  onSelectLifetime: PropTypes.func.isRequired,
  onSelectThisWeek: PropTypes.func.isRequired,
};

export default DateRangeFilter;
