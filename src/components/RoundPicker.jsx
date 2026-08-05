import PropTypes from 'prop-types';
import { hasHoleData } from '../lib/golf';

function roundNote(round) {
  if (!hasHoleData(round)) return ' (totals only)';
  return round.holes.length === 9 ? ' (9 holes)' : '';
}

// Golf deliberately does not use the topbar's From/To date filter: rounds are
// sparse, so "This week" would blank the view and read as broken. It gets a
// round selector plus a window for the aggregate panels instead.
//
// Neither label may contain the substring "to" — Playwright's getByLabel is a
// case-insensitive substring match, so "Rounds to show" would collide with
// filters.spec.js's getByLabel('To'). Hence "Rounds shown".
function RoundPicker({ rounds, selectedDate, onSelectDate, roundsShown, onRoundsShownChange }) {
  return (
    <div className="round-picker">
      <label>
        Round
        <select
          value={selectedDate}
          onChange={(event) => onSelectDate(event.target.value)}
          data-testid="round-select"
        >
          {rounds.map((round) => (
            <option key={round.date} value={round.date}>
              {round.date} · {round.course}
              {/* Flag the reduced rounds in the list itself, so selecting one
                  and getting a shorter view is expected rather than a
                  surprise. */}
              {roundNote(round)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Rounds shown
        <select
          value={roundsShown}
          onChange={(event) => onRoundsShownChange(Number(event.target.value))}
          data-testid="rounds-shown-select"
        >
          <option value={5}>Last 5</option>
          <option value={10}>Last 10</option>
          <option value={0}>All rounds</option>
        </select>
      </label>
    </div>
  );
}

RoundPicker.propTypes = {
  rounds: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      course: PropTypes.string.isRequired,
      holes: PropTypes.array,
    }),
  ).isRequired,
  selectedDate: PropTypes.string.isRequired,
  onSelectDate: PropTypes.func.isRequired,
  roundsShown: PropTypes.number.isRequired,
  onRoundsShownChange: PropTypes.func.isRequired,
};

export default RoundPicker;
