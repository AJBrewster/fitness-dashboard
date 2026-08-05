import PropTypes from 'prop-types';
import { getHoleResult, hasHoleData } from '../lib/golf';
import PanelUnavailable, { NO_HOLE_DATA_ROUND } from './PanelUnavailable';

// The conventional scorecard markers: a circle for under par, a square for
// over, doubled at two strokes out. Shape carries the meaning, and each cell
// also renders the result in visually-hidden text, so the encoding is never
// shape-and-color alone. The bucketing itself lives in lib/golf.js — this is
// only the mapping from a golf result to a class and a spoken name.
const SPOKEN_RESULT = {
  eagle: 'eagle or better',
  birdie: 'birdie',
  par: 'par',
  bogey: 'bogey',
  double: 'double bogey or worse',
};

function ScoreCell({ hole }) {
  const result = getHoleResult(hole.score, hole.par);
  return (
    <td>
      <span className={`score-marker marker-${result}`}>
        {hole.score}
        <span className="sr-only"> {SPOKEN_RESULT[result]}</span>
      </span>
    </td>
  );
}

ScoreCell.propTypes = {
  hole: PropTypes.shape({
    score: PropTypes.number.isRequired,
    par: PropTypes.number.isRequired,
  }).isRequired,
};

function sum(holes, key) {
  return holes.reduce((total, hole) => total + (hole[key] ?? 0), 0);
}

function Nine({ holes, label }) {
  return (
    <>
      <thead>
        <tr>
          <th scope="col">Hole</th>
          {holes.map((hole) => (
            <th scope="col" key={hole.hole}>
              {hole.hole}
            </th>
          ))}
          <th scope="col">{label}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Par</th>
          {holes.map((hole) => (
            <td key={hole.hole}>{hole.par}</td>
          ))}
          <td>{sum(holes, 'par')}</td>
        </tr>
        <tr className="scorecard-scores">
          <th scope="row">Score</th>
          {holes.map((hole) => (
            <ScoreCell hole={hole} key={hole.hole} />
          ))}
          <td>{sum(holes, 'score')}</td>
        </tr>
        <tr>
          <th scope="row">Putts</th>
          {holes.map((hole) => (
            // A dash, not a 0: putts weren't recorded on this hole, which is
            // a different claim from "holed it without putting".
            <td key={hole.hole}>{hole.putts ?? '–'}</td>
          ))}
          <td>{sum(holes, 'putts')}</td>
        </tr>
      </tbody>
    </>
  );
}

Nine.propTypes = {
  holes: PropTypes.array.isRequired,
  label: PropTypes.string.isRequired,
};

function Scorecard({ round }) {
  // An imported round has totals but no holes, so there is no card to draw.
  if (!hasHoleData(round)) {
    return <PanelUnavailable title="Scorecard" reason={NO_HOLE_DATA_ROUND} />;
  }

  const front = round.holes.slice(0, 9);
  const back = round.holes.slice(9);

  return (
    <div className="scorecard" data-testid="scorecard">
      <div className="scorecard-scroll">
        <table>
          <caption className="sr-only">
            Hole-by-hole scorecard for {round.course} on {round.date}
          </caption>
          <Nine holes={front} label="Out" />
          {/* A 9-hole round renders no back nine at all rather than an empty
              row of dashes — see getNineSplit, which returns a null back. */}
          {back.length > 0 && <Nine holes={back} label="In" />}
        </table>
      </div>
    </div>
  );
}

Scorecard.propTypes = {
  round: PropTypes.shape({
    date: PropTypes.string.isRequired,
    course: PropTypes.string.isRequired,
    // Optional: a summary-only round carries no holes at all.
    holes: PropTypes.array,
  }).isRequired,
};

export default Scorecard;
