import PropTypes from 'prop-types';

// Shown in place of any panel that needs hole-by-hole data when the rounds in
// scope only carry round-level totals — which is everything imported from Golf
// Pad's free-tier export (see PLAN.md's Data strategy).
//
// One component rather than a line of copy in each panel: the wording is the
// same problem every time, and if the hole-by-hole export ever becomes
// available there is a single place to change what it says.
function PanelUnavailable({ title, reason }) {
  return (
    <section className="chart panel-unavailable" data-testid="panel-unavailable">
      <h2>{title}</h2>
      <p>{reason}</p>
    </section>
  );
}

PanelUnavailable.propTypes = {
  title: PropTypes.string.isRequired,
  reason: PropTypes.string.isRequired,
};

// The two situations that produce an empty panel, worded for someone reading
// the dashboard rather than for a log: say what's missing and where the data
// would come from, and don't apologise for it.
export const NO_HOLE_DATA_ROUND =
  'This round came from Golf Pad’s round-level export, which records totals but not individual holes.';
export const NO_HOLE_DATA_WINDOW =
  'None of the rounds in view record individual holes. Golf Pad’s round-level export carries totals only.';

export default PanelUnavailable;
