function DateRangeFilter({ start, end, onStartChange, onEndChange }) {
  return (
    <div className="date-range-filter">
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

export default DateRangeFilter;
